import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
export async function test_api_member_token_refresh_success(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create a new member account to get initial refresh token
  const joinConnection: api.IConnection = { host: connection.host };
  const member: IDiscussionBoardUser.IAuthorized = await authorize_member_join(
    joinConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IDiscussionBoardUser.IJoin,
    },
  );
  typia.assert(member);
  // Step 2: Extract the refresh token from the registered member's authentication
  const refreshToken = member.token.refresh;
  // Step 3: Create a new connection object for the refresh operation
  const refreshConnection: api.IConnection = { host: connection.host };
  // Step 4: Use the refresh token to renew authentication
  const refreshedMember: IDiscussionBoardUser.IAuthorized =
    await authorize_member_refresh(refreshConnection, {
      body: {
        refreshToken: refreshToken,
      } satisfies IDiscussionBoardUser.IRefresh,
    });
  typia.assert(refreshedMember);
  // Step 5: Validate that the refreshed token contains new access and refresh tokens
  TestValidator.equals(
    "user ID remains consistent",
    member.id,
    refreshedMember.id,
  );
  TestValidator.equals(
    "display name remains consistent",
    member.displayName,
    refreshedMember.displayName,
  );
  TestValidator.equals(
    "email verification status remains consistent",
    member.emailVerified,
    refreshedMember.emailVerified,
  );
  TestValidator.equals(
    "create time remains consistent",
    member.createdAt,
    refreshedMember.createdAt,
  );
  // Step 6: Validate that token expiration times are extended
  // Original token info
  const originalAccessExp = member.token.expired_at;
  const originalRefreshExp = member.token.refreshable_until;
  // New token info
  const newAccessExp = refreshedMember.token.expired_at;
  const newRefreshExp = refreshedMember.token.refreshable_until;
  // Verify new tokens are issued and expiration times are extended
  TestValidator.notEquals(
    "new access token differs from original",
    member.token.access,
    refreshedMember.token.access,
  );
  TestValidator.notEquals(
    "new refresh token differs from original",
    member.token.refresh,
    refreshedMember.token.refresh,
  );
  // Verify expiration times have been extended - new tokens should expire later
  // Direct type-safe assertion on the date-time format
  typia.assert<string & tags.Format<"date-time">>(newAccessExp);
  typia.assert<string & tags.Format<"date-time">>(newRefreshExp);
  typia.assert<string & tags.Format<"date-time">>(originalAccessExp);
  typia.assert<string & tags.Format<"date-time">>(originalRefreshExp);
  TestValidator.predicate(
    "new access token expires later than original",
    () => {
      return new Date(newAccessExp) > new Date(originalAccessExp);
    },
  );
  TestValidator.predicate(
    "new refresh token refreshable until later than original",
    () => {
      return new Date(newRefreshExp) > new Date(originalRefreshExp);
    },
  );
}
