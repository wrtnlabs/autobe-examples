import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPoliticalForumModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IPoliticalForumModerator";

export async function test_api_moderator_refresh_rejects_wallet_signatures(
  connection: api.IConnection,
) {
  // Test that the refresh endpoint rejects Web3 wallet signatures (0x... format)
  const walletSignatures: (string & tags.Pattern<"^0x[0-9a-fA-F]+">)[] = [
    "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef",
    "0xABCDEF1234567890abcdef1234567890abcdef1234567890abcdef",
    "0x123",
    "0xabcde",
    "0x",
    "0x0",
    "0x1",
  ];

  // Test each wallet signature format
  for (const walletSignature of walletSignatures) {
    await TestValidator.error(
      `wallet signature '${walletSignature}' should be rejected as refresh token`,
      async () => {
        await api.functional.auth.moderator.refresh(connection, {
          body: {
            refresh_token: walletSignature,
          } satisfies IPoliticalForumModerator.IRefresh,
        });
      },
    );
  }
}
