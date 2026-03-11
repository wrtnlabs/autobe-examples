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
import { generate_random_reddit_platform_member_communities_bans_ban } from "../../../generate/generate_random_reddit_platform_member_communities_bans_ban";
import { generate_random_reddit_platform_member_communities_create } from "../../../generate/generate_random_reddit_platform_member_communities_create";
import { prepare_random_reddit_platform_community } from "../../../prepare/prepare_random_reddit_platform_community";
import { prepare_random_reddit_platform_community_ban } from "../../../prepare/prepare_random_reddit_platform_community_ban";

export async function test_api_community_ban_user_permanent(
  connection: api.IConnection,
): Promise<void> {
  // 1. Setup: Create and authenticate as community owner
  const ownerConnection: api.IConnection = { host: connection.host };
  const ownerAuth = await authorize_member_join(ownerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      username: RandomGenerator.alphaNumeric(10),
      password: RandomGenerator.alphaNumeric(12),
      displayName: RandomGenerator.name(1),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
      avatarUrl: null,
      href: "https://example.com/signup",
      referrer: "https://example.com",
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(ownerAuth);
  // 2. Create community
  const community =
    await api.functional.redditPlatform.member.communities.create(
      ownerConnection,
      {
        body: {
          name: RandomGenerator.alphaNumeric(10),
          description: RandomGenerator.paragraph({ sentences: 3 }),
          icon_url: null,
        },
      },
    );
  typia.assert(community);
  // 3. Setup: Create and authenticate as target user (to be banned)
  const userConnection: api.IConnection = { host: connection.host };
  const userAuth = await authorize_member_join(userConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      username: RandomGenerator.alphaNumeric(10),
      password: RandomGenerator.alphaNumeric(12),
      displayName: RandomGenerator.name(1),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
      avatarUrl: null,
      href: "https://example.com/signup",
      referrer: "https://example.com",
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(userAuth);
  // 4. Add target user as moderator (verify owner privileges)
  const moderatorAssignment =
    await api.functional.redditPlatform.member.communities.moderators.addModerator(
      ownerConnection,
      {
        communityId: community.id,
        userId: userAuth.user.id,
      },
    );
  typia.assert(moderatorAssignment);
  // 5. Ban target user permanently (expires_at = null)
  const banRecord =
    await api.functional.redditPlatform.member.communities.bans.ban(
      ownerConnection,
      {
        communityId: community.id,
        userId: userAuth.user.id,
        body: {
          userId: userAuth.user.id,
          expiresAt: null,
        },
      },
    );
  typia.assert(banRecord);
  // 6. Validate ban record structure
  TestValidator.equals(
    "community reference id matches",
    banRecord.community.id,
    community.id,
  );
  TestValidator.equals(
    "community reference name matches",
    banRecord.community.name,
    community.name,
  );
  TestValidator.equals(
    "community reference subscriber_count matches",
    banRecord.community.subscriber_count,
    community.subscriberCount,
  );
  TestValidator.equals(
    "author reference id matches banned user",
    banRecord.author.id,
    userAuth.user.id,
  );
  TestValidator.equals(
    "author reference username matches banned user",
    banRecord.author.username,
    userAuth.user.username,
  );
  TestValidator.equals(
    "author reference display_name matches banned user",
    banRecord.author.display_name,
    userAuth.user.display_name,
  );
  TestValidator.equals(
    "author reference karma_score matches banned user",
    banRecord.author.karma_score,
    userAuth.user.karma_score,
  );
  TestValidator.equals(
    "author reference is_active matches banned user",
    banRecord.author.is_active,
    userAuth.user.is_active,
  );
  TestValidator.equals(
    "author reference created_at matches banned user",
    banRecord.author.created_at,
    userAuth.user.created_at,
  );
  TestValidator.equals(
    "expires_at is null (permanent ban)",
    banRecord.expiresAt,
    null,
  );
  TestValidator.equals(
    "deleted_at is null (ban is active)",
    banRecord.deletedAt,
    null,
  );
  // 7. Validate community owner reference in ban record
  TestValidator.equals(
    "community owner id matches original owner",
    banRecord.community.owner.id,
    community.owner.id,
  );
  TestValidator.equals(
    "community owner username matches original owner",
    banRecord.community.owner.username,
    community.owner.username,
  );
}
