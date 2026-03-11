import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditPlatformAdmin";
import type { IRedditPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformAdmin";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_admin_list_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create admin account using utility function
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      username: RandomGenerator.alphaNumeric(16),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
      avatar_url: typia.random<string & tags.Format<"uri">>() ?? null,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>() ?? null,
    } satisfies IRedditPlatformAdmin.IJoin,
  });
  typia.assert(adminAuth);
  // Step 2: Request list of all administrators with default pagination
  const result = await api.functional.redditPlatform.admin.admins.index(
    adminConnection,
    {
      body: {},
    },
  );
  typia.assert(result);
  // Step 3: Validate response structure
  TestValidator.predicate(
    "response has pagination field",
    result.pagination !== undefined,
  );
  TestValidator.predicate(
    "response has data array",
    Array.isArray(result.data),
  );
  // Step 4: Validate pagination metadata
  TestValidator.predicate(
    "pagination current page is positive",
    result.pagination.current > 0,
  );
  TestValidator.predicate(
    "pagination limit is positive",
    result.pagination.limit > 0,
  );
  TestValidator.predicate(
    "pagination records is non-negative",
    result.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages is calculated correctly",
    result.pagination.pages ===
      Math.ceil(result.pagination.records / result.pagination.limit),
  );
  // Step 5: Validate admin data structure if any admins exist
  if (result.data.length > 0) {
    const firstAdmin = result.data[0];
    // Validate required fields exist and have correct types
    TestValidator.predicate(
      "admin has valid id format",
      /^[0-9a-f-]{36}$/i.test(firstAdmin.id),
    );
    TestValidator.predicate(
      "admin has username",
      typeof firstAdmin.username === "string",
    );
    TestValidator.predicate(
      "admin has display_name",
      typeof firstAdmin.display_name === "string",
    );
    TestValidator.predicate(
      "admin has valid email format",
      /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(firstAdmin.email),
    );
    TestValidator.predicate(
      "admin has bio",
      typeof firstAdmin.bio === "string",
    );
    TestValidator.predicate(
      "admin has avatar_url",
      typeof firstAdmin.avatar_url === "string",
    );
    TestValidator.predicate(
      "admin has is_active",
      typeof firstAdmin.is_active === "boolean",
    );
    TestValidator.predicate(
      "admin has created_at format",
      /^[0-9]{4}-[0-9]{2}-[0-9]{2}T/.test(firstAdmin.created_at),
    );
  }
}
