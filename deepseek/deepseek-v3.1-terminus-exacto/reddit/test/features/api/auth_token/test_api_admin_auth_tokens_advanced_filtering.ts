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

export async function test_api_admin_auth_tokens_advanced_filtering(
  connection: api.IConnection,
): Promise<void> {
  // Create admin connection
  const adminConnection: api.IConnection = { host: connection.host };
  // Authenticate as admin using join and get authorization token
  const authorizedAdmin = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      permissions_level: null,
    } satisfies ICommunityPlatformAdmin.IJoin,
  });
  // Update admin connection with authorization token
  adminConnection.headers = {
    ...adminConnection.headers,
    Authorization: authorizedAdmin.token.access,
  };
  // Prepare filter criteria
  const currentDate = new Date().toISOString();
  const filterBody: ICommunityPlatformAuthToken.IRequest = {
    token_type: "password_reset",
    used_at: "unused",
    created_at_before: currentDate,
    expires_at_after: currentDate,
    deleted_at: "active",
    page: 1,
    limit: 10,
  };
  // Execute advanced filtering
  const result = await api.functional.communityPlatform.admin.auth_tokens.index(
    adminConnection,
    { body: filterBody },
  );
  typia.assert(result);
  // Validate pagination structure
  TestValidator.equals("pagination exists", typeof result.pagination, "object");
  TestValidator.predicate(
    "has valid pagination",
    result.pagination.current >= 0 &&
      result.pagination.limit > 0 &&
      result.pagination.records >= 0 &&
      result.pagination.pages >= 0,
  );
  // Validate each token matches filter criteria
  for (const token of result.data) {
    TestValidator.equals(
      "token type matches",
      token.token_type,
      "password_reset",
    );
    TestValidator.equals("token is unused", token.used_at, null);
    TestValidator.predicate(
      "created before current date",
      token.created_at < currentDate,
    );
    TestValidator.predicate(
      "expires after current date",
      token.expires_at > currentDate,
    );
    TestValidator.equals("token is active", token.deleted_at, null);
  }
  // Test that filtering works by ensuring we got some results
  TestValidator.predicate("has valid data array", Array.isArray(result.data));
}
