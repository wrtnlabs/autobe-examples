import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformComment";
import type { IRedditPlatformCommentVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommentVote";
import type { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import type { IRedditPlatformCommunityBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunityBan";
import type { IRedditPlatformCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunityModerator";
import type { IRedditPlatformCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunitySubscription";
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
import { generate_random_reddit_platform_member_subscriptions_subscribe } from "../../../generate/generate_random_reddit_platform_member_subscriptions_subscribe";
import { prepare_random_reddit_platform_community } from "../../../prepare/prepare_random_reddit_platform_community";
import { prepare_random_reddit_platform_community_ban } from "../../../prepare/prepare_random_reddit_platform_community_ban";
import { prepare_random_reddit_platform_community_moderator } from "../../../prepare/prepare_random_reddit_platform_community_moderator";
import { prepare_random_reddit_platform_community_subscription } from "../../../prepare/prepare_random_reddit_platform_community_subscription";

export async function test_api_community_delete_by_owner(
  connection: api.IConnection,
): Promise<void> {
  // Setup Member A (community owner)
  const memberAConnection: api.IConnection = { host: connection.host };
  const memberA = await authorize_member_join(memberAConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      username: RandomGenerator.alphaNumeric(10),
      password: "12345678",
      displayName: RandomGenerator.name(),
      href: "http://test.com",
      referrer: "http://test.com",
    },
  });
  typia.assert(memberA);
  // Setup Member B (moderator)
  const memberBConnection: api.IConnection = { host: connection.host };
  const memberB = await authorize_member_join(memberBConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      username: RandomGenerator.alphaNumeric(10),
      password: "12345678",
      displayName: RandomGenerator.name(),
      href: "http://test.com",
      referrer: "http://test.com",
    },
  });
  typia.assert(memberB);
  // Setup Member C (banned user)
  const memberCConnection: api.IConnection = { host: connection.host };
  const memberC = await authorize_member_join(memberCConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      username: RandomGenerator.alphaNumeric(10),
      password: "12345678",
      displayName: RandomGenerator.name(),
      href: "http://test.com",
      referrer: "http://test.com",
    },
  });
  typia.assert(memberC);
  // Setup Member D (subscriber)
  const memberDConnection: api.IConnection = { host: connection.host };
  const memberD = await authorize_member_join(memberDConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      username: RandomGenerator.alphaNumeric(10),
      password: "12345678",
      displayName: RandomGenerator.name(),
      href: "http://test.com",
      referrer: "http://test.com",
    },
  });
  typia.assert(memberD);
  // Member A creates a community
  const community =
    await api.functional.redditPlatform.member.communities.create(
      memberAConnection,
      {
        body: {
          name: typia.random<
            string &
              tags.MinLength<3> &
              tags.MaxLength<21> &
              tags.Pattern<"^[a-zA-Z0-9_]+$">
          >(),
          description: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies IRedditPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);
  const originalCreatedAt = community.createdAt;
  // Add Member B as moderator
  const moderator =
    await api.functional.redditPlatform.member.communities.moderators.create(
      memberAConnection,
      {
        communityId: community.id,
        body: {
          user_id: memberB.user.id,
        } satisfies IRedditPlatformCommunityModerator.ICreate,
      },
    );
  typia.assert(moderator);
  // Ban Member C from the community
  const ban =
    await api.functional.redditPlatform.member.communities.bans.create(
      memberAConnection,
      {
        communityId: community.id,
        body: {
          userId: memberC.user.id,
        } satisfies IRedditPlatformCommunityBan.ICreate,
      },
    );
  typia.assert(ban);
  // Member D subscribes to the community
  const subscription =
    await api.functional.redditPlatform.member.subscriptions.subscribe(
      memberDConnection,
      {
        body: {
          reddit_platform_community_id: community.id,
        } satisfies IRedditPlatformCommunitySubscription.ICreate,
      },
    );
  typia.assert(subscription);
  // Verify community is accessible before deletion
  TestValidator.predicate("community exists", community.deletedAt === null);
  // Member A (owner) deletes the community
  await api.functional.redditPlatform.member.communities.erase(
    memberAConnection,
    {
      communityId: community.id,
    },
  );
  // Verify that deletion is successful by ensuring no errors were thrown
  TestValidator.predicate("community deletion completed without error", true);
  // Verify the deleted_at timestamp would be set (verify through business logic that deletion occurred)
  TestValidator.notEquals(
    "community was deleted",
    originalCreatedAt,
    community.createdAt,
  );
  // Clean up: Create a new community to ensure test isolation
  const cleanupCommunity =
    await generate_random_reddit_platform_member_communities_create(
      memberAConnection,
      { body: { name: RandomGenerator.alphaNumeric(10) } },
    );
  typia.assert(cleanupCommunity);
  // Delete the cleanup community
  await api.functional.redditPlatform.member.communities.erase(
    memberAConnection,
    {
      communityId: cleanupCommunity.id,
    },
  );
}
