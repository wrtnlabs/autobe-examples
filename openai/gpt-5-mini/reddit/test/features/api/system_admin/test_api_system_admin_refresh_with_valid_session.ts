import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityBbsSystemAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsSystemAdmin";

export async function test_api_system_admin_refresh_with_valid_session(
  connection: api.IConnection,
) {
  // 1) Create a new system administrator account to obtain initial tokens
  const createBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "Passw0rd!",
    display_name: RandomGenerator.name(),
  } satisfies ICommunityBbsSystemAdmin.ICreate;

  const authorized: ICommunityBbsSystemAdmin.IAuthorized =
    await api.functional.auth.systemAdmin.join(connection, {
      body: createBody,
    });
  // Runtime type assertion for the join response
  typia.assert(authorized);

  // Validate token existence
  const token: IAuthorizationToken = authorized.token;
  typia.assert(token);
  TestValidator.predicate(
    "join: access token is present",
    typeof token.access === "string" && token.access.length > 0,
  );
  TestValidator.predicate(
    "join: refresh token is present",
    typeof token.refresh === "string" && token.refresh.length > 0,
  );

  // 2) Use the captured refresh token to call the refresh endpoint
  const refreshBody = {
    refresh_token: token.refresh,
  } satisfies ICommunityBbsSystemAdmin.IRefresh;

  const refreshed: ICommunityBbsSystemAdmin.IAuthorized =
    await api.functional.auth.systemAdmin.refresh(connection, {
      body: refreshBody,
    });
  typia.assert(refreshed);

  // Business validations:
  // - The admin identity should remain the same after refresh
  TestValidator.equals(
    "refreshed: admin id preserved",
    refreshed.admin.id,
    authorized.admin.id,
  );

  // - A fresh access token must be present
  TestValidator.predicate(
    "refreshed: new access token present",
    typeof refreshed.token.access === "string" &&
      refreshed.token.access.length > 0,
  );

  // - Access token should generally differ from the original access token
  //   (implementation may rotate; we only assert inequality for access token)
  TestValidator.notEquals(
    "refreshed: access token changed",
    refreshed.token.access,
    authorized.token.access,
  );

  // 3) Negative test: refresh with an invalid refresh token must fail
  await TestValidator.error(
    "refresh with invalid token should fail",
    async () => {
      await api.functional.auth.systemAdmin.refresh(connection, {
        body: {
          refresh_token: "this-is-an-invalid-refresh-token",
        } satisfies ICommunityBbsSystemAdmin.IRefresh,
      });
    },
  );

  // NOTE: Session row / audit log verification is not possible here because
  // the provided SDK exposes only join and refresh for systemAdmin. Direct
  // DB access or audit endpoints are not available in the supplied materials,
  // so session/audit checks are omitted.
}
