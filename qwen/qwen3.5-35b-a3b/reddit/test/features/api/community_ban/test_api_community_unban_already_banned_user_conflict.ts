import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditPlatformBannedUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformBannedUser";
import type { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import type { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_platform_member_communities_bans_create } from "../../../generate/generate_random_reddit_platform_member_communities_bans_create";
import { generate_random_reddit_platform_member_communities_create } from "../../../generate/generate_random_reddit_platform_member_communities_create";
import { prepare_random_reddit_platform_banned_user } from "../../../prepare/prepare_random_reddit_platform_banned_user";
import { prepare_random_reddit_platform_community } from "../../../prepare/prepare_random_reddit_platform_community";

export async function test_api_community_unban_already_banned_user_conflict(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate member 1 (moderator/owner)
  const member1Connection: api.IConnection = { host: connection.host };
  const member1Auth = await authorize_member_join(member1Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username:
        RandomGenerator.alphaNumeric(8) + "_" + RandomGenerator.alphaNumeric(3),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(member1Auth);
  // 2. Authenticate member 2 (user to be banned)
  const member2Connection: api.IConnection = { host: connection.host };
  const member2Auth = await authorize_member_join(member2Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username:
        RandomGenerator.alphaNumeric(8) + "_" + RandomGenerator.alphaNumeric(3),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(member2Auth);
  // 3. Create community with member 1 as owner
  const member1ConnectionForCommunity: api.IConnection = {
    host: connection.host,
    headers: { Authorization: `Bearer ${member1Auth.token.access}` },
  };
  const community =
    await api.functional.redditPlatform.member.communities.create(
      member1ConnectionForCommunity,
      {
        body: {
          name: RandomGenerator.alphaNumeric(10).toLowerCase(),
          description: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies IRedditPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);
  // 4. Create ban record for member 2 using member 1 (moderator)
  const member1ConnectionForBan: api.IConnection = {
    host: connection.host,
    headers: { Authorization: `Bearer ${member1Auth.token.access}` },
  };
  const banRecord =
    await api.functional.redditPlatform.member.communities.bans.create(
      member1ConnectionForBan,
      {
        communityName: community.name,
        body: {
          user_id: member2Auth.id,
          reason: RandomGenerator.paragraph({ sentences: 1 }),
        } satisfies IRedditPlatformBannedUser.ICreate,
      },
    );
  typia.assert(banRecord);
  // Verify initial ban state
  TestValidator.equals("ban initial unbanned_at", banRecord.unbanned_at, null);
  // 5. First unban attempt (should succeed)
  const member1ConnectionForUnban1: api.IConnection = {
    host: connection.host,
    headers: { Authorization: `Bearer ${member1Auth.token.access}` },
  };
  await api.functional.redditPlatform.member.communities.bans.erase(
    member1ConnectionForUnban1,
    {
      communityName: community.name,
      userId: member2Auth.id,
    },
  );
  // 6. Second unban attempt (should return 409 Conflict)
  const member1ConnectionForUnban2: api.IConnection = {
    host: connection.host,
    headers: { Authorization: `Bearer ${member1Auth.token.access}` },
  };
  await TestValidator.error("second unban returns 409 conflict", async () => {
    await api.functional.redditPlatform.member.communities.bans.erase(
      member1ConnectionForUnban2,
      {
        communityName: community.name,
        userId: member2Auth.id,
      },
    );
  });
}