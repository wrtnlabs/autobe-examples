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

export async function test_api_member_token_refresh_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member joins to obtain initial refresh token
  const memberConnection: api.IConnection = { host: connection.host };
  const joinResponse = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(1),
      bio: RandomGenerator.paragraph({ sentences: 3 }),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardMember.IJoin,
  });
  typia.assert(joinResponse);
  // Store initial refresh token
  const initialRefreshToken = joinResponse.token.refresh;
  // 2. Submit refresh token to refresh endpoint
  const refreshResponse = await authorize_member_refresh(memberConnection, {
    body: {
      refresh: initialRefreshToken,
    } satisfies IDiscussionBoardMember.IRefresh,
  });
  typia.assert(refreshResponse);
  // 3. Verify new access token is issued (not empty)
  TestValidator.predicate(
    "access token issued",
    refreshResponse.token.access.length > 0,
  );
  // 4. Verify new refresh token is issued (not empty)
  TestValidator.predicate(
    "refresh token issued",
    refreshResponse.token.refresh.length > 0,
  );
  // 5. Verify member profile information is returned
  TestValidator.equals(
    "member id matches",
    refreshResponse.id,
    joinResponse.id,
  );
  TestValidator.equals(
    "email matches",
    refreshResponse.email,
    joinResponse.email,
  );
  TestValidator.equals(
    "display name matches",
    refreshResponse.displayName,
    joinResponse.displayName,
  );
  TestValidator.predicate(
    "ban status is active",
    refreshResponse.banStatus === "active",
  );
  // 6. Verify token expiration times are valid
  TestValidator.predicate(
    "access token has future expiration",
    new Date(refreshResponse.token.expired_at) > new Date(),
  );
  TestValidator.predicate(
    "refreshable until has future expiration",
    new Date(refreshResponse.token.refreshable_until) > new Date(),
  );
  // 7. Verify previous refresh token is invalidated (should fail when used again)
  await TestValidator.error("previous refresh token invalidated", async () => {
    await api.functional.discussionBoard.auth.member.refresh(memberConnection, {
      body: {
        refresh: initialRefreshToken,
      } satisfies IDiscussionBoardMember.IRefresh,
    });
  });
}
