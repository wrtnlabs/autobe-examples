import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import type { ICommunityPlatformCommentVote } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommentVote";
import type { ICommunityPlatformCommentVoteSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommentVoteSnapshot";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformFile } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformFile";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformPostAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostAttachment";
import type { ICommunityPlatformPostLink } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostLink";
import type { ICommunityPlatformPostText } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostText";
import type { ICommunityPlatformSubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformSubscription";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformCommentVoteSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformCommentVoteSnapshot";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_community_platform_member_comments_votes_create } from "../../../generate/generate_random_community_platform_member_comments_votes_create";
import { generate_random_community_platform_member_communities_create } from "../../../generate/generate_random_community_platform_member_communities_create";
import { generate_random_community_platform_member_posts_comments_create } from "../../../generate/generate_random_community_platform_member_posts_comments_create";
import { generate_random_community_platform_member_posts_create } from "../../../generate/generate_random_community_platform_member_posts_create";
import { generate_random_community_platform_member_subscriptions_create } from "../../../generate/generate_random_community_platform_member_subscriptions_create";
import { prepare_random_community_platform_comment } from "../../../prepare/prepare_random_community_platform_comment";
import { prepare_random_community_platform_comment_vote } from "../../../prepare/prepare_random_community_platform_comment_vote";
import { prepare_random_community_platform_community } from "../../../prepare/prepare_random_community_platform_community";
import { prepare_random_community_platform_post } from "../../../prepare/prepare_random_community_platform_post";
import { prepare_random_community_platform_post_attachment } from "../../../prepare/prepare_random_community_platform_post_attachment";
import { prepare_random_community_platform_post_link } from "../../../prepare/prepare_random_community_platform_post_link";
import { prepare_random_community_platform_post_text } from "../../../prepare/prepare_random_community_platform_post_text";
import { prepare_random_community_platform_subscription } from "../../../prepare/prepare_random_community_platform_subscription";

export async function test_api_comment_vote_snapshots_filtering_by_vote_type(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create and authenticate member
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      username: RandomGenerator.alphaNumeric(12),
      nickname: RandomGenerator.name(1),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(member);
  // 2. Create community
  const community =
    await generate_random_community_platform_member_communities_create(
      memberConnection,
      {
        body: {
          name: RandomGenerator.alphaNumeric(10).toLowerCase(),
          description: RandomGenerator.paragraph({ sentences: 2 }),
        },
      },
    );
  typia.assert(community);
  // 3. Subscribe to community
  const subscription =
    await generate_random_community_platform_member_subscriptions_create(
      memberConnection,
      {
        body: {
          community_id: community.id,
          active: true,
        },
      },
    );
  typia.assert(subscription);
  // 4. Create post in community
  const post = await generate_random_community_platform_member_posts_create(
    memberConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 1 }),
        community_name: community.name,
        content_type: "TEXT",
        content_text: {
          content: RandomGenerator.paragraph({ sentences: 3 }),
          formatting: "plain",
        },
      },
    },
  );
  typia.assert(post);
  // 5. Create first comment
  const comment1 =
    await generate_random_community_platform_member_posts_comments_create(
      memberConnection,
      {
        body: {
          content: RandomGenerator.paragraph({ sentences: 1 }),
        },
        params: { postId: post.id },
      },
    );
  typia.assert(comment1);
  // 6. Create upvote on first comment (will generate upvote snapshot)
  const upvote =
    await generate_random_community_platform_member_comments_votes_create(
      memberConnection,
      {
        body: {
          type: "upvote",
        },
        params: { commentId: comment1.id },
      },
    );
  typia.assert(upvote);
  // 7. Create second comment
  const comment2 =
    await generate_random_community_platform_member_posts_comments_create(
      memberConnection,
      {
        body: {
          content: RandomGenerator.paragraph({ sentences: 1 }),
        },
        params: { postId: post.id },
      },
    );
  typia.assert(comment2);
  // 8. Create downvote on second comment (will generate downvote snapshot)
  const downvote =
    await generate_random_community_platform_member_comments_votes_create(
      memberConnection,
      {
        body: {
          type: "downvote",
        },
        params: { commentId: comment2.id },
      },
    );
  typia.assert(downvote);
  // 9. Test filtering by vote_type = "upvote"
  const upvoteSnapshots =
    await api.functional.communityPlatform.member.comments.votes.snapshots.index(
      memberConnection,
      {
        commentId: comment1.id,
        voteId: upvote.id,
        body: {
          vote_type: "upvote",
          page: 1,
          limit: 10,
        } satisfies ICommunityPlatformCommentVoteSnapshot.IRequest,
      },
    );
  typia.assert(upvoteSnapshots);
  // Validate only upvote snapshots returned
  TestValidator.equals("snapshots list length", upvoteSnapshots.data.length, 1);
  TestValidator.equals(
    "vote_type filtering",
    upvoteSnapshots.data[0].vote_type,
    "upvote",
  );
  TestValidator.equals(
    "pagination records count",
    upvoteSnapshots.pagination.records,
    1,
  );
  // 10. Test filtering by vote_type = "downvote"
  const downvoteSnapshots =
    await api.functional.communityPlatform.member.comments.votes.snapshots.index(
      memberConnection,
      {
        commentId: comment2.id,
        voteId: downvote.id,
        body: {
          vote_type: "downvote",
          page: 1,
          limit: 10,
        } satisfies ICommunityPlatformCommentVoteSnapshot.IRequest,
      },
    );
  typia.assert(downvoteSnapshots);
  TestValidator.equals(
    "downvote snapshots list length",
    downvoteSnapshots.data.length,
    1,
  );
  TestValidator.equals(
    "vote_type filtering downvote",
    downvoteSnapshots.data[0].vote_type,
    "downvote",
  );
  TestValidator.equals(
    "downvote pagination records count",
    downvoteSnapshots.pagination.records,
    1,
  );
  // 11. Test snapshot_reason filtering
  // Note: snapshot_reason is generated by the system, we need to test filtering
  // by checking if we can filter by existing snapshot reason
  const allSnapshots =
    await api.functional.communityPlatform.member.comments.votes.snapshots.index(
      memberConnection,
      {
        commentId: comment1.id,
        voteId: upvote.id,
        body: {
          page: 1,
          limit: 10,
        } satisfies ICommunityPlatformCommentVoteSnapshot.IRequest,
      },
    );
  typia.assert(allSnapshots);
  if (allSnapshots.data.length > 0 && allSnapshots.data[0].snapshot_reason) {
    const reason = allSnapshots.data[0].snapshot_reason;
    const reasonFilteredSnapshots =
      await api.functional.communityPlatform.member.comments.votes.snapshots.index(
        memberConnection,
        {
          commentId: comment1.id,
          voteId: upvote.id,
          body: {
            snapshot_reason: reason,
            page: 1,
            limit: 10,
          } satisfies ICommunityPlatformCommentVoteSnapshot.IRequest,
        },
      );
    typia.assert(reasonFilteredSnapshots);
    TestValidator.predicate(
      "snapshot_reason filter returns results",
      reasonFilteredSnapshots.data.length > 0,
    );
    TestValidator.equals(
      "all filtered snapshots have matching reason",
      reasonFilteredSnapshots.data.every(
        (snapshot) => snapshot.snapshot_reason === reason,
      ),
      true,
    );
  }
}
