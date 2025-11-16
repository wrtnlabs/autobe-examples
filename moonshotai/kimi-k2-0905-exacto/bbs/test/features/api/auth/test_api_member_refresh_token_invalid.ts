import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconomicDiscussionMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionMember";

/**
 * Test token refresh failure when an invalid or expired refresh token is
 * provided. This ensures the system rejects invalid refresh attempts and
 * maintains authentication security integrity.
 */
export async function test_api_member_refresh_token_invalid(
  connection: api.IConnection,
) {
  // Test with completely random/invalid token string
  await TestValidator.error("random token should fail", async () => {
    await api.functional.auth.member.refresh(connection, {
      body: {
        refresh_token: RandomGenerator.alphabets(32),
      } satisfies IEconomicDiscussionMember.IRefresh,
    });
  });

  // Test with malformed UUID format token
  await TestValidator.error("malformed token should fail", async () => {
    await api.functional.auth.member.refresh(connection, {
      body: {
        refresh_token: "malformed-token-123",
      } satisfies IEconomicDiscussionMember.IRefresh,
    });
  });

  // Test with expired token that would have been valid format
  await TestValidator.error("expired format token should fail", async () => {
    await api.functional.auth.member.refresh(connection, {
      body: {
        refresh_token: typia.random<string & tags.Format<"uuid">>(),
      } satisfies IEconomicDiscussionMember.IRefresh,
    });
  });

  // Test with empty token
  await TestValidator.error("empty token should fail", async () => {
    await api.functional.auth.member.refresh(connection, {
      body: {
        refresh_token: "",
      } satisfies IEconomicDiscussionMember.IRefresh,
    });
  });
}
