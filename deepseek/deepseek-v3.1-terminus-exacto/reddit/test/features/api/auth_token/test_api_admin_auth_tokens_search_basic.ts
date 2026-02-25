import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformAuthToken } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAuthToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformAuthToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformAuthToken";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_admin_auth_tokens_search_basic(
  connection: api.IConnection,
): Promise<void> {
  // Create admin connection and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      permissions_level: null,
    },
  });
  typia.assert(admin);
  // Perform basic search for active authentication tokens
  const searchResult =
    await api.functional.communityPlatform.admin.auth_tokens.index(
      adminConnection,
      {
        body: {
          deleted_at: "active", // Only active tokens (deleted_at is null)
          page: 1,
          limit: 10,
        } satisfies ICommunityPlatformAuthToken.IRequest,
      },
    );
  typia.assert(searchResult);
  // Validate pagination metadata
  TestValidator.equals(
    "pagination current page",
    searchResult.pagination.current,
    1,
  );
  TestValidator.equals("pagination limit", searchResult.pagination.limit, 10);
  TestValidator.predicate(
    "pagination records non-negative",
    searchResult.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages non-negative",
    searchResult.pagination.pages >= 0,
  );
  // Validate token summary structure for each returned token
  for (const token of searchResult.data) {
    typia.assert(token);
    // Verify essential fields exist
    TestValidator.predicate("token has id", typeof token.id === "string");
    TestValidator.predicate(
      "token has token_type",
      typeof token.token_type === "string",
    );
    TestValidator.predicate(
      "token has created_at",
      typeof token.created_at === "string",
    );
    TestValidator.predicate(
      "token has expires_at",
      typeof token.expires_at === "string",
    );
    // Verify active tokens have deleted_at as null
    TestValidator.equals(
      "active token deleted_at is null",
      token.deleted_at,
      null,
    );
    // Verify used_at can be null or valid date-time
    if (token.used_at !== null) {
      TestValidator.predicate(
        "used_at is valid date-time",
        typeof token.used_at === "string",
      );
    }
  }
  // Test pagination calculation consistency
  if (searchResult.pagination.limit > 0) {
    const expectedPages = Math.ceil(
      searchResult.pagination.records / searchResult.pagination.limit,
    );
    TestValidator.equals(
      "pagination pages calculation",
      searchResult.pagination.pages,
      expectedPages,
    );
  }
}
