import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";

/**
 * Test multiple consecutive token refresh operations for member authentication.
 *
 * This test validates the continuous authentication workflow where members can
 * maintain their session through multiple token refresh cycles. It ensures
 * that:
 *
 * 1. Members can refresh tokens multiple times in succession
 * 2. Each refresh cycle produces new, distinct tokens
 * 3. Member identity remains consistent across all refreshes
 * 4. The refresh token chain maintains session continuity
 *
 * Test Steps:
 *
 * 1. Create a new member account via join endpoint (get initial tokens)
 * 2. Use the refresh token to obtain a second set of tokens
 * 3. Use the new refresh token to obtain a third set of tokens
 * 4. Validate all refresh operations succeed
 * 5. Verify each refresh cycle produces different tokens
 * 6. Confirm member information remains unchanged across all refreshes
 */
export async function test_api_member_token_refresh_multiple_times(
  connection: api.IConnection,
) {
  // Step 1: Create a new member account and obtain initial tokens
  const memberData = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    username: RandomGenerator.name(2),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IDiscussionBoardMember.ICreate;

  const firstResponse: IDiscussionBoardMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: memberData,
    });
  typia.assert(firstResponse);

  // Step 2: First refresh - use initial refresh token to get second set of tokens
  const secondResponse: IDiscussionBoardMember.IAuthorized =
    await api.functional.auth.member.refresh(connection, {
      body: {
        refresh_token: firstResponse.token.refresh,
      } satisfies IDiscussionBoardMember.IRefresh,
    });
  typia.assert(secondResponse);

  // Step 3: Second refresh - use refresh token from first refresh to get third set
  const thirdResponse: IDiscussionBoardMember.IAuthorized =
    await api.functional.auth.member.refresh(connection, {
      body: {
        refresh_token: secondResponse.token.refresh,
      } satisfies IDiscussionBoardMember.IRefresh,
    });
  typia.assert(thirdResponse);

  // Step 4: Validate that all three operations succeeded and returned proper data
  // (typia.assert already validated structure, now validate business logic)

  // Step 5: Verify each refresh cycle produces different tokens
  TestValidator.notEquals(
    "first and second access tokens should differ",
    firstResponse.token.access,
    secondResponse.token.access,
  );
  TestValidator.notEquals(
    "first and second refresh tokens should differ",
    firstResponse.token.refresh,
    secondResponse.token.refresh,
  );
  TestValidator.notEquals(
    "second and third access tokens should differ",
    secondResponse.token.access,
    thirdResponse.token.access,
  );
  TestValidator.notEquals(
    "second and third refresh tokens should differ",
    secondResponse.token.refresh,
    thirdResponse.token.refresh,
  );
  TestValidator.notEquals(
    "first and third access tokens should differ",
    firstResponse.token.access,
    thirdResponse.token.access,
  );
  TestValidator.notEquals(
    "first and third refresh tokens should differ",
    firstResponse.token.refresh,
    thirdResponse.token.refresh,
  );

  // Step 6: Confirm member identity remains consistent across all refreshes
  TestValidator.equals(
    "member id should remain consistent",
    firstResponse.id,
    secondResponse.id,
  );
  TestValidator.equals(
    "member id should remain consistent in third response",
    secondResponse.id,
    thirdResponse.id,
  );
  TestValidator.equals(
    "username should remain consistent",
    firstResponse.username,
    secondResponse.username,
  );
  TestValidator.equals(
    "username should remain consistent in third response",
    secondResponse.username,
    thirdResponse.username,
  );
  TestValidator.equals(
    "email should remain consistent",
    firstResponse.email,
    secondResponse.email,
  );
  TestValidator.equals(
    "email should remain consistent in third response",
    secondResponse.email,
    thirdResponse.email,
  );
}
