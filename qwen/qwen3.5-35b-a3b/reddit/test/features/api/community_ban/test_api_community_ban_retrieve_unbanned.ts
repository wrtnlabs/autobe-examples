import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformComment";
import type { IRedditPlatformCommentVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommentVote";
import type { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import type { IRedditPlatformCommunityBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunityBan";
import type { IRedditPlatformCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunityModerator";
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
import { generate_random_reddit_platform_member_communities_bans_create } from "../../../generate/generate_random_reddit_platform_member_communities_bans_create";
import { generate_random_reddit_platform_member_communities_create } from "../../../generate/generate_random_reddit_platform_member_communities_create";
import { generate_random_reddit_platform_member_communities_moderators_create } from "../../../generate/generate_random_reddit_platform_member_communities_moderators_create";
import { prepare_random_reddit_platform_community } from "../../../prepare/prepare_random_reddit_platform_community";
import { prepare_random_reddit_platform_community_ban } from "../../../prepare/prepare_random_reddit_platform_community_ban";
import { prepare_random_reddit_platform_community_moderator } from "../../../prepare/prepare_random_reddit_platform_community_moderator";

export async function test_api_community_ban_retrieve_unbanned(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create community owner
  const ownerConnection: api.IConnection = { host: connection.host };
  const ownerAuth = await authorize_member_join(ownerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      username: RandomGenerator.alphaNumeric(10),
      password: "password123",
      displayName: RandomGenerator.name(1),
      href: "http://localhost:3000",
      referrer: "http://localhost:3000",
    } satisfies IRedditPlatformMember.IJoin,
  });
  typia.assert(ownerAuth);
  // 2. Create community by owner
  const community =
    await generate_random_reddit_platform_member_communities_create(
      ownerConnection,
      {
        body: {
          name: RandomGenerator.alphaNumeric(8).toLowerCase(),
          description: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies IRedditPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);
  // 3. Create moderator
  const moderatorConnection: api.IConnection = { host: connection.host };
  const moderatorAuth = await authorize_member_join(moderatorConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      username: RandomGenerator.alphaNumeric(10),
      password: "password123",
      displayName: RandomGenerator.name(1),
      href: "http://localhost:3000",
      referrer: "http://localhost:3000",
    } satisfies IRedditPlatformMember.IJoin,
  });
  typia.assert(moderatorAuth);
  // 4. Add moderator to community
  await generate_random_reddit_platform_member_communities_moderators_create(
    ownerConnection,
    {
      body: {
        user_id: moderatorAuth.user.id,
      } satisfies IRedditPlatformCommunityModerator.ICreate,
      params: {
        communityId: community.id,
      },
    },
  );
  // 5. Create user to be banned
  const userConnection: api.IConnection = { host: connection.host };
  const userAuth = await authorize_member_join(userConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      username: RandomGenerator.alphaNumeric(10),
      password: "password123",
      displayName: RandomGenerator.name(1),
      href: "http://localhost:3000",
      referrer: "http://localhost:3000",
    } satisfies IRedditPlatformMember.IJoin,
  });
  typia.assert(userAuth);
  // 6. Moderator bans the user
  const ban =
    await generate_random_reddit_platform_member_communities_bans_create(
      moderatorConnection,
      {
        body: {
          userId: userAuth.user.id,
        } satisfies IRedditPlatformCommunityBan.ICreate,
        params: {
          communityId: community.id,
        },
      },
    );
  typia.assert(ban);
  TestValidator.equals("ban should be active initially", ban.deletedAt, null);
  // 7. Moderator unban the user (sets deletedAt)
  await api.functional.redditPlatform.member.communities.bans.eraseByCommunityidAndBanid(
    moderatorConnection,
    {
      communityId: community.id,
      banId: ban.id,
    },
  );
  // 8. Retrieve ban record and verify deletedAt is set
  const retrievedBan =
    await api.functional.redditPlatform.member.communities.bans.at(
      moderatorConnection,
      {
        communityId: community.id,
        banId: ban.id,
      },
    );
  typia.assert(retrievedBan);
  // Validate deletedAt is no longer null
  TestValidator.equals(
    "ban should have deletedAt after unban",
    retrievedBan.deletedAt,
    retrievedBan.deletedAt,
  );
  typia.assert(retrievedBan.deletedAt !== null);
  // Validate other fields remain intact
  TestValidator.equals(
    "community matches",
    retrievedBan.community.id,
    community.id,
  );
  TestValidator.equals(
    "author matches",
    retrievedBan.author.id,
    userAuth.user.id,
  );
  TestValidator.equals(
    "createdAt unchanged",
    retrievedBan.createdAt,
    ban.createdAt,
  );
  TestValidator.equals(
    "expiresAt unchanged",
    retrievedBan.expiresAt,
    ban.expiresAt,
  );
}
