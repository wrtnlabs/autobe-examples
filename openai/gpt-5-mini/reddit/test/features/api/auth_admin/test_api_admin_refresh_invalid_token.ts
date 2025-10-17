import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPortalAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPortalAdmin";
import type { ICommunityPortalUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPortalUser";

export async function test_api_admin_refresh_invalid_token(
  connection: api.IConnection,
) {
  // 1) Create an admin account to establish a valid context
  const username = RandomGenerator.alphaNumeric(8);
  const email = typia.random<string & tags.Format<"email">>();

  const createBody = {
    username,
    email,
    password: "P@ssw0rd!123",
    displayName: null,
    isActive: true,
  } satisfies ICommunityPortalAdmin.ICreate;

  const adminAuth: ICommunityPortalAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: createBody,
    });
  // Validate the successful join response
  typia.assert(adminAuth);

  // 2) Attempt to refresh with a malformed/invalid refresh token
  await TestValidator.error(
    "refresh with malformed token should fail",
    async () => {
      await api.functional.auth.admin.refresh(connection, {
        body: {
          refresh_token: "this-is-not-a-valid-refresh-token",
        } satisfies ICommunityPortalAdmin.IRefresh,
      });
    },
  );

  // 3) Attempt to refresh with an expired-looking token string
  await TestValidator.error(
    "refresh with expired-looking token should fail",
    async () => {
      // Example of an expired-looking JWT placeholder (still a string)
      await api.functional.auth.admin.refresh(connection, {
        body: {
          refresh_token: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVC1leHBpcmVk",
        } satisfies ICommunityPortalAdmin.IRefresh,
      });
    },
  );

  // End of test: we only assert that invalid refresh attempts throw errors.
}
