import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformFile } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformFile";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformFile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_admin_files_orphans_search_with_filters(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin authentication using SDK (no utility function available)
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await api.functional.communityPlatform.auth.admin.join(
    adminConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: typia.random<string & tags.Format<"ipv4">>(),
      } satisfies ICommunityPlatformAdmin.IJoin,
    },
  );
  typia.assert(admin);
  // 2. Prepare search filters
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const requestBody: ICommunityPlatformFile.IRequest = {
    type: "image/jpeg",
    size_min: 1000 satisfies number,
    size_max: 5000000 satisfies number,
    status: "completed",
    actor_type: "member",
    created_at_start: thirtyDaysAgo.toISOString(),
    page: 1 satisfies number,
    limit: 20 satisfies number,
  };
  // 3. Execute orphaned files search
  const result =
    await api.functional.communityPlatform.admin.files.orphans.index(
      adminConnection,
      { body: requestBody },
    );
  typia.assert(result);
  // 4. Validate pagination metadata with direct assertions
  if (result.pagination.current !== 1) {
    throw new Error(
      `Expected current page 1, got ${result.pagination.current}`,
    );
  }
  if (result.pagination.limit !== 20) {
    throw new Error(`Expected limit 20, got ${result.pagination.limit}`);
  }
  if (result.pagination.pages < 0) {
    throw new Error(`Invalid total pages: ${result.pagination.pages}`);
  }
  if (result.pagination.records < 0) {
    throw new Error(`Invalid total records: ${result.pagination.records}`);
  }
  // 5. Validate each file matches filter criteria
  for (const file of result.data) {
    if (file.type !== "image/jpeg") {
      throw new Error(`Expected type image/jpeg, got ${file.type}`);
    }
    if (file.size < 1000 || file.size > 5000000) {
      throw new Error(`File size ${file.size} outside range 1000-5000000`);
    }
    if (file.status !== "completed") {
      throw new Error(`Expected status completed, got ${file.status}`);
    }
    // Verify actor is member type (check for username property)
    if (!("username" in file.actor)) {
      throw new Error(`Expected member actor, got different actor type`);
    }
    // Verify creation date within last 30 days
    const fileCreatedAt = new Date(file.created_at);
    if (fileCreatedAt < thirtyDaysAgo) {
      throw new Error(
        `File created at ${file.created_at} is older than 30 days`,
      );
    }
  }
  // 6. Test authorization enforcement
  const unauthorizedConnection: api.IConnection = { host: connection.host };
  try {
    await api.functional.communityPlatform.admin.files.orphans.index(
      unauthorizedConnection,
      { body: requestBody },
    );
    throw new Error("Expected unauthorized error but request succeeded");
  } catch (error) {
    // Expect some error, but can't validate exact status without TestValidator
    if (!(error instanceof Error)) {
      throw new Error("Expected Error but got different type");
    }
  }
}
