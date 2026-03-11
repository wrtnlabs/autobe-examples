import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Test security validation by attempting refresh with invalid or tampered refresh tokens.
 * This scenario ensures the endpoint properly validates token authenticity and prevents token manipulation attacks.
 */
export async function test_api_member_refresh_invalid_token_security(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member account and obtain valid tokens
  const memberConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_member_join(memberConnection, {
    body: {
      bio: RandomGenerator.paragraph({ sentences: 2 }),
    },
  });
  typia.assert(authorized);
  const validRefreshToken = authorized.token.refresh;
  // 2. Create various invalid token variants
  const invalidTokens = {
    // Tampered token - modify last few characters
    tampered: validRefreshToken.slice(0, -5) + "ABCDE",
    // Random gibberish - completely invalid token
    gibberish: RandomGenerator.alphaNumeric(64),
    // Empty token
    empty: "",
    // Malformed format - not a proper token structure
    malformed: "Bearer invalid.token.format",
    // Token with null bytes (potential injection)
    nullBytes: "token\x00with\x00null\x00bytes",
  };
  // 3. Test each invalid token variant
  const refreshEndpoint = api.functional.discussionBoard.auth.member.refresh;
  // Test tampered token
  await TestValidator.error("tampered token should be rejected", async () => {
    await refreshEndpoint(memberConnection, {
      body: {
        refreshToken: invalidTokens.tampered,
      } satisfies IDiscussionBoardMember.IRefresh,
    });
  });
  // Test random gibberish token
  await TestValidator.error("random gibberish should be rejected", async () => {
    await refreshEndpoint(memberConnection, {
      body: {
        refreshToken: invalidTokens.gibberish,
      } satisfies IDiscussionBoardMember.IRefresh,
    });
  });
  // Test empty token
  await TestValidator.error("empty token should be rejected", async () => {
    await refreshEndpoint(memberConnection, {
      body: {
        refreshToken: invalidTokens.empty,
      } satisfies IDiscussionBoardMember.IRefresh,
    });
  });
  // Test malformed format token
  await TestValidator.error("malformed format should be rejected", async () => {
    await refreshEndpoint(memberConnection, {
      body: {
        refreshToken: invalidTokens.malformed,
      } satisfies IDiscussionBoardMember.IRefresh,
    });
  });
  // 4. Verify legitimate refresh token still works
  const refreshed = await refreshEndpoint(memberConnection, {
    body: {
      refreshToken: validRefreshToken,
    } satisfies IDiscussionBoardMember.IRefresh,
  });
  typia.assert(refreshed);
  // Validate new token has proper structure
  TestValidator.predicate(
    "refreshed token should have access token",
    typeof refreshed.token.access === "string" &&
      refreshed.token.access.length > 0,
  );
  TestValidator.predicate(
    "refreshed token should have refresh token",
    typeof refreshed.token.refresh === "string" &&
      refreshed.token.refresh.length > 0,
  );
  TestValidator.predicate(
    "refreshed token should have expiration",
    typeof refreshed.token.expired_at === "string" &&
      refreshed.token.expired_at.length > 0,
  );
  TestValidator.predicate(
    "refreshed token should have refreshable until",
    typeof refreshed.token.refreshable_until === "string" &&
      refreshed.token.refreshable_until.length > 0,
  );
}
