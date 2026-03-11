import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMultiUserTodoAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoAdmin";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

/**
 * Test admin refresh operation with invalid or tampered refresh tokens.
 * Validate that the system rejects tokens with invalid signatures or malformed structure.
 */
export async function test_api_admin_refresh_token_invalid(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create admin account and get valid tokens
  const adminConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_admin_join(adminConnection, {});
  typia.assert(authorized);
  const validRefreshToken = authorized.token.refresh;
  // 2. Test malformed JWT token (not a valid JWT structure)
  await TestValidator.error("malformed JWT token", async () => {
    await authorize_admin_refresh(
      { host: connection.host },
      {
        body: {
          refreshToken: "not.a.valid.jwt.token",
        } satisfies IMultiUserTodoAdmin.IRefresh,
      },
    );
  });
  // 3. Test tampered signature (modify valid token's signature section)
  const parts = validRefreshToken.split(".");
  if (parts.length === 3) {
    const tamperedToken = `${parts[0]}.${parts[1]}.${RandomGenerator.alphaNumeric(64)}`;
    await TestValidator.error("tampered signature", async () => {
      await authorize_admin_refresh(
        { host: connection.host },
        {
          body: {
            refreshToken: tamperedToken,
          } satisfies IMultiUserTodoAdmin.IRefresh,
        },
      );
    });
  }
  // 4. Test completely random string (not JWT format)
  await TestValidator.error("random string token", async () => {
    await authorize_admin_refresh(
      { host: connection.host },
      {
        body: {
          refreshToken: RandomGenerator.alphaNumeric(128),
        } satisfies IMultiUserTodoAdmin.IRefresh,
      },
    );
  });
  // 5. Test valid JWT structure but invalid signature (header.payload.signature format with wrong signature)
  await TestValidator.error("valid format invalid signature", async () => {
    await authorize_admin_refresh(
      { host: connection.host },
      {
        body: {
          refreshToken:
            "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c", // Standard test JWT
        } satisfies IMultiUserTodoAdmin.IRefresh,
      },
    );
  });
  // 6. Verify the original valid refresh token actually works (positive test)
  const refreshed = await authorize_admin_refresh(
    { host: connection.host },
    {
      body: {
        refreshToken: validRefreshToken,
      } satisfies IMultiUserTodoAdmin.IRefresh,
    },
  );
  typia.assert(refreshed);
  TestValidator.equals("admin ID preserved", refreshed.id, authorized.id);
  TestValidator.equals("email preserved", refreshed.email, authorized.email);
}
