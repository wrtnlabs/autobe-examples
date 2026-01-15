import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformFlag } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformFlag";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformFlag } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformFlag";
import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
export async function test_api_flag_management_pending_review(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Authenticate as admin to access moderation endpoints
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      href: "https://example.com/join",
      referrer: "https://example.com",
      ip: null,
    } satisfies ICommunityPlatformAdmin.IJoin,
  });
  // Step 2: Query for pending flags with member reporter and post association
  // This endpoint retrieves flags, and we assume sufficient pending flags exist
  const response = await api.functional.communityPlatform.admin.flags.index(
    adminConnection,
    {
      body: {
        status: "pending",
        reporterActorType: "member",
        associationType: "post",
        associatedResourceId: "post-",
      } satisfies ICommunityPlatformFlag.IRequest,
    },
  );
  typia.assert(response);
  // Step 3: Validate pagination
  TestValidator.equals(
    "pagination should have 10 items per page",
    response.pagination.limit,
    10,
  );
  TestValidator.equals(
    "currentPage should be 1",
    response.pagination.current,
    1,
  );
  TestValidator.predicate(
    "total records should be at least 1",
    response.pagination.records >= 1,
  );
  TestValidator.equals(
    "total pages should be at least 1",
    response.pagination.pages,
    Math.ceil(response.pagination.records / 10),
  );
  // Step 4: Validate that data contains flags with required properties
  TestValidator.predicate(
    "should return at least one flag",
    response.data.length >= 1,
  );
  for (const flag of response.data) {
    TestValidator.equals("status should be pending", flag.status, "pending");
    TestValidator.equals(
      "reporter_type should be member",
      flag.reporter_type,
      "member",
    );
    TestValidator.equals(
      "associated_type should be post",
      flag.associated_type,
      "post",
    );
    TestValidator.predicate(
      "associatedId should start with post-",
      flag.associatedId.startsWith("post-"),
    );
    TestValidator.predicate(
      "created_at should be in ISO format",
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(flag.created_at),
    );
  }
  // Step 5: Verify sorting by creation date (newest first)
  for (let i = 0; i < response.data.length - 1; i++) {
    const currentFlag = response.data[i];
    const nextFlag = response.data[i + 1];
    // Convert ISO strings to dates for comparison
    const currentDate = new Date(currentFlag.created_at);
    const nextDate = new Date(nextFlag.created_at);
    // Newest (larger timestamp) should come first
    TestValidator.predicate(
      "flags should be sorted by creation date (newest first)",
      currentDate >= nextDate,
    );
  }
}