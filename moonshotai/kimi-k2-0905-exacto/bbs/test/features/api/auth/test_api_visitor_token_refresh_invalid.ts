import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPoliticsBbsUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IPoliticsBbsUser";
import type { IPoliticsBbsVisitorUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IPoliticsBbsVisitorUser";

export async function test_api_visitor_token_refresh_invalid(
  connection: api.IConnection,
) {
  // Step 1: Create a valid visitor account to understand token structure
  const validVisitor = await api.functional.auth.visitor.join(connection, {
    body: {
      href: "https://example.com/visitor/join",
      referrer: "https://example.com/referrer",
      username: typia.random<
        string &
          tags.MinLength<3> &
          tags.MaxLength<20> &
          tags.Pattern<"^[a-zA-Z0-9-]+$">
      >(),
      password: typia.random<
        string &
          tags.MinLength<8> &
          tags.Pattern<"^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d).*$">
      >(),
    } satisfies IPoliticsBbsVisitorUser.IJoin,
  });
  typia.assert(validVisitor);

  // Step 2: Test with completely invalid/malformed token (random string)
  await TestValidator.error(
    "refresh with invalid token format should fail",
    async () => {
      await api.functional.auth.visitor.refresh(connection, {
        body: {
          refresh_token: RandomGenerator.alphaNumeric(32),
        } satisfies IPoliticsBbsUser.IRefresh,
      });
    },
  );

  // Step 3: Test with empty token
  await TestValidator.error(
    "refresh with empty token should fail",
    async () => {
      await api.functional.auth.visitor.refresh(connection, {
        body: {
          refresh_token: "",
        } satisfies IPoliticsBbsUser.IRefresh,
      });
    },
  );

  // Step 4: Test with null token (not allowed by types, but API might handle)
  // Note: This test shows intent even if TypeScript prevents it

  // Step 5: Test with token from theoretically expired session (manipulated token)
  const expiredToken =
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImV4cGlyZWQiLCJleHAiOjE2Mzc2NjQwMDB9.invalid";
  await TestValidator.error(
    "refresh with expired token should fail",
    async () => {
      await api.functional.auth.visitor.refresh(connection, {
        body: {
          refresh_token: expiredToken,
        } satisfies IPoliticsBbsUser.IRefresh,
      });
    },
  );

  // Step 6: Test with valid format but invalid internal structure
  const validJWT = `${RandomGenerator.alphaNumeric(20)}.${RandomGenerator.alphaNumeric(20)}.${RandomGenerator.alphaNumeric(20)}`;
  await TestValidator.error(
    "refresh with invalid JWT structure should fail",
    async () => {
      await api.functional.auth.visitor.refresh(connection, {
        body: {
          refresh_token: validJWT,
        } satisfies IPoliticsBbsUser.IRefresh,
      });
    },
  );

  // Verify that valid token still works (basic security check)
  const validRefresh = await api.functional.auth.visitor.refresh(connection, {
    body: {
      refresh_token: validVisitor.token.refresh,
    } satisfies IPoliticsBbsUser.IRefresh,
  });
  typia.assert(validRefresh);
}
