import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformFile } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformFile";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformPostAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostAttachment";
import type { ICommunityPlatformPostLink } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostLink";
import type { ICommunityPlatformPostText } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostText";
import type { ICommunityPlatformPostVote } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostVote";
import type { ICommunityPlatformPostVoteSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostVoteSnapshot";
import type { ICommunityPlatformSubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformSubscription";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_community_platform_member_communities_create } from "../../../generate/generate_random_community_platform_member_communities_create";
import { generate_random_community_platform_member_posts_create } from "../../../generate/generate_random_community_platform_member_posts_create";
import { generate_random_community_platform_member_posts_votes_create } from "../../../generate/generate_random_community_platform_member_posts_votes_create";
import { generate_random_community_platform_member_subscriptions_create } from "../../../generate/generate_random_community_platform_member_subscriptions_create";
import { prepare_random_community_platform_community } from "../../../prepare/prepare_random_community_platform_community";
import { prepare_random_community_platform_post } from "../../../prepare/prepare_random_community_platform_post";
import { prepare_random_community_platform_post_attachment } from "../../../prepare/prepare_random_community_platform_post_attachment";
import { prepare_random_community_platform_post_link } from "../../../prepare/prepare_random_community_platform_post_link";
import { prepare_random_community_platform_post_text } from "../../../prepare/prepare_random_community_platform_post_text";
import { prepare_random_community_platform_post_vote } from "../../../prepare/prepare_random_community_platform_post_vote";
import { prepare_random_community_platform_subscription } from "../../../prepare/prepare_random_community_platform_subscription";

export async function test_api_admin_vote_snapshot_cross_community_audit(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin setup
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies ICommunityPlatformAdmin.IJoin,
  });
  typia.assert(admin);
  // 2. Create author member
  const authorConnection: api.IConnection = { host: connection.host };
  const author = await authorize_member_join(authorConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      username: RandomGenerator.alphaNumeric(12),
      nickname: RandomGenerator.name(1),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies ICommunityPlatformMember.IJoin,
  });
  typia.assert(author);
  // 3. Create voter members for different communities
  const voter1Connection: api.IConnection = { host: connection.host };
  const voter1 = await authorize_member_join(voter1Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      username: RandomGenerator.alphaNumeric(12),
      nickname: RandomGenerator.name(1),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies ICommunityPlatformMember.IJoin,
  });
  typia.assert(voter1);
  const voter2Connection: api.IConnection = { host: connection.host };
  const voter2 = await authorize_member_join(voter2Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      username: RandomGenerator.alphaNumeric(12),
      nickname: RandomGenerator.name(1),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies ICommunityPlatformMember.IJoin,
  });
  typia.assert(voter2);
  // 4. Author creates two communities
  const communityA =
    await generate_random_community_platform_member_communities_create(
      authorConnection,
      {
        body: {
          name: RandomGenerator.alphaNumeric(8).toLowerCase(),
          description: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(communityA);
  const communityB =
    await generate_random_community_platform_member_communities_create(
      authorConnection,
      {
        body: {
          name: RandomGenerator.alphaNumeric(8).toLowerCase(),
          description: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(communityB);
  // 5. Author subscribes to community A (required for posting)
  const authorSubscription =
    await generate_random_community_platform_member_subscriptions_create(
      authorConnection,
      {
        body: {
          community_id: communityA.id,
          active: true,
        } satisfies ICommunityPlatformSubscription.ICreate,
      },
    );
  typia.assert(authorSubscription);
  // 6. Voter1 subscribes to community A
  const voter1Subscription =
    await generate_random_community_platform_member_subscriptions_create(
      voter1Connection,
      {
        body: {
          community_id: communityA.id,
          active: true,
        } satisfies ICommunityPlatformSubscription.ICreate,
      },
    );
  typia.assert(voter1Subscription);
  // 7. Voter2 subscribes to community B (different community)
  const voter2Subscription =
    await generate_random_community_platform_member_subscriptions_create(
      voter2Connection,
      {
        body: {
          community_id: communityB.id,
          active: true,
        } satisfies ICommunityPlatformSubscription.ICreate,
      },
    );
  typia.assert(voter2Subscription);
  // 8. Author creates post in community A
  const post = await generate_random_community_platform_member_posts_create(
    authorConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        community_name: communityA.name,
        content_type: "TEXT",
        content_text: {
          content: RandomGenerator.paragraph({ sentences: 3 }),
          formatting: "plain",
        } satisfies ICommunityPlatformPostText.ICreate,
      } satisfies ICommunityPlatformPost.ICreate,
    },
  );
  typia.assert(post);
  // 9. Voter1 upvotes the post (same community)
  const upvote =
    await generate_random_community_platform_member_posts_votes_create(
      voter1Connection,
      {
        body: {
          type: "up",
        } satisfies ICommunityPlatformPostVote.ICreate,
        params: {
          postId: post.id,
        },
      },
    );
  typia.assert(upvote);
  // 10. Voter2 downvotes the post (different community)
  const downvote =
    await generate_random_community_platform_member_posts_votes_create(
      voter2Connection,
      {
        body: {
          type: "down",
        } satisfies ICommunityPlatformPostVote.ICreate,
        params: {
          postId: post.id,
        },
      },
    );
  typia.assert(downvote);
  // 11. Admin retrieves vote snapshot for upvote
  const upvoteSnapshot =
    await api.functional.communityPlatform.admin.posts.votes.snapshots.at(
      adminConnection,
      {
        postId: post.id,
        voteId: upvote.id,
        snapshotId: typia.random<string & tags.Format<"uuid">>(), // Need actual snapshot ID
      },
    );
  typia.assert(upvoteSnapshot);
  // 12. Admin retrieves vote snapshot for downvote
  const downvoteSnapshot =
    await api.functional.communityPlatform.admin.posts.votes.snapshots.at(
      adminConnection,
      {
        postId: post.id,
        voteId: downvote.id,
        snapshotId: typia.random<string & tags.Format<"uuid">>(), // Need actual snapshot ID
      },
    );
  typia.assert(downvoteSnapshot);
  // 13. Validate snapshot properties
  TestValidator.equals(
    "upvote snapshot voteType should be upvote",
    upvoteSnapshot.voteType,
    "upvote",
  );
  TestValidator.equals(
    "upvote snapshot karmaImpact should be +1",
    upvoteSnapshot.karmaImpact,
    1,
  );
  TestValidator.equals(
    "upvote snapshot reason should be initial_vote",
    upvoteSnapshot.snapshotReason,
    "initial_vote",
  );
  TestValidator.equals(
    "downvote snapshot voteType should be downvote",
    downvoteSnapshot.voteType,
    "downvote",
  );
  TestValidator.equals(
    "downvote snapshot karmaImpact should be -1",
    downvoteSnapshot.karmaImpact,
    -1,
  );
  TestValidator.equals(
    "downvote snapshot reason should be initial_vote",
    downvoteSnapshot.snapshotReason,
    "initial_vote",
  );
  // 14. Validate admin cross-community access capability
  TestValidator.equals(
    "admin should retrieve upvote snapshot from community A",
    upvoteSnapshot.post.id,
    post.id,
  );
  TestValidator.equals(
    "admin should retrieve downvote snapshot from community B voter",
    downvoteSnapshot.post.id,
    post.id,
  );
  TestValidator.predicate(
    "admin can access vote snapshots across community boundaries",
    upvoteSnapshot.member.id === voter1.id &&
      downvoteSnapshot.member.id === voter2.id,
  );
}
