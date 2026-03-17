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

/**
 * Test retrieval of a vote snapshot after a downvote on another member's comment.
 * 1. Voting member creates account, community, subscribes, and creates post.
 * 2. Author member creates account and comments on post.
 * 3. Voting member casts downvote on comment, generating snapshot.
 * 4. Retrieve snapshot and validate vote_type is 'downvote', appropriate snapshot reason,
 *    and references to both voting member and comment author.
 */
export async function test_api_comment_vote_snapshot_retrieval_after_downvote(
  connection: api.IConnection,
): Promise<void> {
  // 1. Voting member setup
  const votingConnection: api.IConnection = { host: connection.host };
  const votingMember = await api.functional.communityPlatform.auth.member.join(
    votingConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: typia.random<string & tags.Format<"password">>(),
        username: RandomGenerator.alphaNumeric(12),
        nickname: RandomGenerator.name(1),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: typia.random<string & tags.Format<"ipv4">>(),
      } satisfies ICommunityPlatformMember.IJoin,
    },
  );
  typia.assert(votingMember);
  // Voting member creates community
  const community =
    await api.functional.communityPlatform.member.communities.create(
      votingConnection,
      {
        body: {
          name: RandomGenerator.alphaNumeric(8),
          description: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);
  // Voting member subscribes to own community
  const subscription =
    await api.functional.communityPlatform.member.subscriptions.create(
      votingConnection,
      {
        body: {
          community_id: community.id,
          active: true,
        } satisfies ICommunityPlatformSubscription.ICreate,
      },
    );
  typia.assert(subscription);
  // Voting member creates post in community
  const post = await api.functional.communityPlatform.member.posts.create(
    votingConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 1 }),
        community_name: community.name,
        content_type: "TEXT",
        content_text: {
          content: RandomGenerator.content({ paragraphs: 1 }),
          formatting: "plain",
        },
      } satisfies ICommunityPlatformPost.ICreate,
    },
  );
  typia.assert(post);
  // 2. Author member setup
  const authorConnection: api.IConnection = { host: connection.host };
  const authorMember = await api.functional.communityPlatform.auth.member.join(
    authorConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: typia.random<string & tags.Format<"password">>(),
        username: RandomGenerator.alphaNumeric(12),
        nickname: RandomGenerator.name(1),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: typia.random<string & tags.Format<"ipv4">>(),
      } satisfies ICommunityPlatformMember.IJoin,
    },
  );
  typia.assert(authorMember);
  // Author member creates comment on the post
  const comment =
    await api.functional.communityPlatform.member.posts.comments.create(
      authorConnection,
      {
        postId: post.id,
        body: {
          content: RandomGenerator.content({ paragraphs: 1 }),
        } satisfies ICommunityPlatformComment.ICreate,
      },
    );
  typia.assert(comment);
  // 3. Voting member casts downvote on comment
  const vote =
    await api.functional.communityPlatform.member.comments.votes.create(
      votingConnection,
      {
        commentId: comment.id,
        body: {
          type: "downvote",
        } satisfies ICommunityPlatformCommentVote.ICreate,
      },
    );
  typia.assert(vote);
  // 4. Retrieve snapshot - there's no direct API to list snapshots for a vote
  // We need to get the snapshot ID from somewhere - for this test we assume
  // snapshot ID is returned in vote response or can be inferred
  // Since no list endpoint exists, we'll use vote.id as snapshotId (simplification)
  const snapshot =
    await api.functional.communityPlatform.member.comments.votes.snapshots.at(
      votingConnection,
      {
        commentId: comment.id,
        voteId: vote.id,
        snapshotId: vote.id, // Assume snapshot ID same as vote ID for testing
      },
    );
  typia.assert(snapshot);
  // 5. Validate snapshot content
  TestValidator.equals(
    "snapshot vote type should be downvote",
    snapshot.vote_type,
    "downvote",
  );
  TestValidator.predicate(
    "snapshot should have snapshot_reason",
    snapshot.snapshot_reason !== null && snapshot.snapshot_reason.length > 0,
  );
  TestValidator.equals(
    "snapshot voting member should match voting member",
    snapshot.member.id,
    votingMember.id,
  );
  TestValidator.equals(
    "snapshot comment should match commented comment",
    snapshot.comment.id,
    comment.id,
  );
  TestValidator.equals(
    "snapshot comment author should match comment author",
    snapshot.comment.author.id,
    authorMember.id,
  );
  TestValidator.predicate(
    "snapshot should have timestamp",
    snapshot.created_at !== "",
  );
}
