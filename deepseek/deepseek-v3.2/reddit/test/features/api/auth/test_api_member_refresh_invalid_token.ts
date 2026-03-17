import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformFile } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformFile";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
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
 * Test token refresh failure with expired or invalid refresh token.
 * First, create a member account via join endpoint. Then attempt to call refresh
 * with an invalid refresh_token (malformed, expired, or belonging to a different
 * session). Verify that the operation returns an appropriate authentication error
 * (401 Unauthorized) and does not issue new tokens. This validates that the
 * system properly rejects invalid refresh tokens, maintaining session security.
 * Test with various invalid scenarios: 1) Random string that's not a valid JWT
 * format, 2) Token from a deleted or expired session, 3) Token that has already
 * been used and invalidated (if implementing one-time use). Ensure the error
 * response does not leak sensitive information about why the token is invalid.
 */
export async function test_api_member_refresh_invalid_token(
  connection: api.IConnection,
): Promise<void> {
  // Create member account and get valid tokens
  const memberConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_member_join(memberConnection, {});
  typia.assert(authorized);
  // Test 1: Random non-JWT string
  await TestValidator.error(
    "refresh should fail with random non-JWT string",
    async () => {
      await api.functional.communityPlatform.auth.member.refresh(
        memberConnection,
        {
          body: {
            refresh_token: RandomGenerator.alphaNumeric(32),
          } satisfies ICommunityPlatformMember.IRefresh,
        },
      );
    },
  );
  // Test 2: Empty string
  await TestValidator.error(
    "refresh should fail with empty string",
    async () => {
      await api.functional.communityPlatform.auth.member.refresh(
        memberConnection,
        {
          body: {
            refresh_token: "",
          } satisfies ICommunityPlatformMember.IRefresh,
        },
      );
    },
  );
  // Test 3: Token from different session (generate random UUID)
  await TestValidator.error(
    "refresh should fail with random UUID token",
    async () => {
      await api.functional.communityPlatform.auth.member.refresh(
        memberConnection,
        {
          body: {
            refresh_token: typia.random<string & tags.Format<"uuid">>(),
          } satisfies ICommunityPlatformMember.IRefresh,
        },
      );
    },
  );
  // Test 4: Valid token that has been tampered with (add extra characters)
  await TestValidator.error(
    "refresh should fail with tampered token",
    async () => {
      await api.functional.communityPlatform.auth.member.refresh(
        memberConnection,
        {
          body: {
            refresh_token: authorized.token.refresh + "tampered",
          } satisfies ICommunityPlatformMember.IRefresh,
        },
      );
    },
  );
  // Test 5: Verify that valid refresh token still works
  const refreshed = await api.functional.communityPlatform.auth.member.refresh(
    memberConnection,
    {
      body: {
        refresh_token: authorized.token.refresh,
      } satisfies ICommunityPlatformMember.IRefresh,
    },
  );
  typia.assert(refreshed);
  TestValidator.notEquals(
    "new token should differ from original",
    refreshed.token.access,
    authorized.token.access,
  );
  TestValidator.notEquals(
    "new refresh token should differ from original",
    refreshed.token.refresh,
    authorized.token.refresh,
  );
}
