import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformComment";
import type { IRedditPlatformCommentVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommentVote";
import type { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import type { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import type { IRedditPlatformMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMemberSession";
import type { IRedditPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPost";
import type { IRedditPlatformPostVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPostVote";
import type { IRedditPlatformReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformReport";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_member_refresh_token_rotation_security(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member account and get initial tokens
  const memberConnection: api.IConnection = { host: connection.host };
  const joinResult = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      username: RandomGenerator.alphaNumeric(10),
      password: RandomGenerator.alphaNumeric(12),
      displayName: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
      avatarUrl: null,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IRedditPlatformMember.IJoin,
  });
  typia.assert(joinResult);
  // 2. Extract old refresh token for later validation
  const oldRefreshToken = joinResult.token.refresh;
  typia.assertGuard(oldRefreshToken);
  // 3. Perform first refresh to get new tokens
  const memberRefreshConnection: api.IConnection = { host: connection.host };
  memberRefreshConnection.headers = {
    Authorization: joinResult.token.access,
  };
  const firstRefreshResult = await authorize_member_refresh(
    memberRefreshConnection,
    {
      body: { refresh_token: oldRefreshToken },
    },
  );
  typia.assert(firstRefreshResult);
  // 4. Verify first refresh succeeded and returned new tokens
  const newRefreshToken = firstRefreshResult.token.refresh;
  typia.assertGuard(newRefreshToken);
  TestValidator.notEquals(
    "new refresh token differs from old",
    newRefreshToken,
    oldRefreshToken,
  );
  // 5. Verify old refresh token is immediately rejected
  const memberReuseConnection: api.IConnection = {
    host: connection.host,
  };
  memberReuseConnection.headers = {
    Authorization: firstRefreshResult.token.access,
  };
  await TestValidator.error(
    "old refresh token rejected after rotation",
    async () => {
      await authorize_member_refresh(memberReuseConnection, {
        body: { refresh_token: oldRefreshToken },
      });
    },
  );
  // 6. Verify new refresh token can be used for subsequent refresh
  const memberSecondRefreshConnection: api.IConnection = {
    host: connection.host,
  };
  memberSecondRefreshConnection.headers = {
    Authorization: firstRefreshResult.token.access,
  };
  const secondRefreshResult = await authorize_member_refresh(
    memberSecondRefreshConnection,
    {
      body: { refresh_token: newRefreshToken },
    },
  );
  typia.assert(secondRefreshResult);
  // 7. Verify third token (from second refresh) is different from second
  const thirdRefreshToken = secondRefreshResult.token.refresh;
  typia.assertGuard(thirdRefreshToken);
  TestValidator.notEquals(
    "third refresh token differs from second",
    thirdRefreshToken,
    newRefreshToken,
  );
  // 8. Verify user profile is returned in refresh response
  TestValidator.equals(
    "refresh returns valid user profile",
    firstRefreshResult.user.id,
    joinResult.user.id,
  );
}
