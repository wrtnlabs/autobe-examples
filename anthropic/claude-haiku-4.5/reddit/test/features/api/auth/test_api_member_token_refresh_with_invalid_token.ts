import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";

/**
 * Test token refresh rejection when an invalid or malformed refresh token is
 * provided.
 *
 * The endpoint validates refresh tokens to ensure they match valid JWT format
 * and structure. Invalid, corrupted, or non-existent tokens must be rejected
 * with appropriate error responses. This validation prevents token injection
 * attacks and ensures only legitimate tokens can be used to refresh access
 * tokens.
 *
 * Steps:
 *
 * 1. Create a valid member account to understand token structure
 * 2. Validate the token structure from successful registration
 * 3. Attempt refresh with empty string token - should fail
 * 4. Attempt refresh with malformed JWT token - should fail
 * 5. Attempt refresh with random invalid string - should fail
 * 6. Attempt refresh with corrupted token (modified payload) - should fail
 */
export async function test_api_member_token_refresh_with_invalid_token(
  connection: api.IConnection,
) {
  // Step 1: Create a valid member account to understand token structure
  const joinResponse: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        username: typia.random<
          string &
            tags.MinLength<3> &
            tags.MaxLength<50> &
            tags.Pattern<"^[a-zA-Z0-9_-]+$">
        >(),
        password: "ValidPassword123!",
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies ICommunityPlatformMember.ICreate,
    });
  typia.assert(joinResponse);

  // Step 2: Validate the token structure from successful registration
  TestValidator.predicate(
    "valid join response contains access token",
    joinResponse.token.access.length > 0,
  );
  TestValidator.predicate(
    "valid join response contains refresh token",
    joinResponse.token.refresh.length > 0,
  );

  // Step 3: Attempt refresh with empty string token - should fail
  await TestValidator.error(
    "empty string refresh token should be rejected",
    async () => {
      await api.functional.auth.member.refresh(connection, {
        body: {
          refresh_token: "",
        } satisfies ICommunityPlatformMember.IRefresh,
      });
    },
  );

  // Step 4: Attempt refresh with malformed JWT token - should fail
  await TestValidator.error(
    "malformed JWT token should be rejected",
    async () => {
      await api.functional.auth.member.refresh(connection, {
        body: {
          refresh_token: "invalid.jwt.structure",
        } satisfies ICommunityPlatformMember.IRefresh,
      });
    },
  );

  // Step 5: Attempt refresh with random invalid string - should fail
  await TestValidator.error(
    "random invalid string token should be rejected",
    async () => {
      await api.functional.auth.member.refresh(connection, {
        body: {
          refresh_token: RandomGenerator.alphaNumeric(50),
        } satisfies ICommunityPlatformMember.IRefresh,
      });
    },
  );

  // Step 6: Attempt refresh with corrupted token (modified payload) - should fail
  const corruptedToken = `${joinResponse.token.refresh.split(".")[0]}.corrupted_payload.${joinResponse.token.refresh.split(".")[2]}`;
  await TestValidator.error(
    "corrupted refresh token with modified payload should be rejected",
    async () => {
      await api.functional.auth.member.refresh(connection, {
        body: {
          refresh_token: corruptedToken,
        } satisfies ICommunityPlatformMember.IRefresh,
      });
    },
  );
}
