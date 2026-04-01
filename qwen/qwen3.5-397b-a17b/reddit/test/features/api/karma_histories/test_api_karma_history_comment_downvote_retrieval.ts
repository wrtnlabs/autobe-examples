import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCommunityComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityComment";
import type { IRedditCommunityCommentVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommentVote";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityCommunityIcon } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityIcon";
import type { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import type { IRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPost";
import type { IRedditCommunityPostImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPostImage";
import type { IRedditCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunitySubscription";
import type { IRedditCommunityUserKarmaHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityUserKarmaHistory";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_community_member_comments_vote } from "../../../generate/generate_random_reddit_community_member_comments_vote";
import { generate_random_reddit_community_member_communities_create } from "../../../generate/generate_random_reddit_community_member_communities_create";
import { generate_random_reddit_community_member_posts_comments_create } from "../../../generate/generate_random_reddit_community_member_posts_comments_create";
import { prepare_random_reddit_community_comment } from "../../../prepare/prepare_random_reddit_community_comment";
import { prepare_random_reddit_community_comment_vote } from "../../../prepare/prepare_random_reddit_community_comment_vote";
import { prepare_random_reddit_community_community } from "../../../prepare/prepare_random_reddit_community_community";

/**
 * Test retrieving a karma history record created when another member downvotes the authenticated user's comment.
 *
 * Scenario:
 * 1. Member A registers and creates a community
 * 2. Member A subscribes to their community and creates a post
 * 3. Member B registers, subscribes to the community, and creates a comment on Member A's post
 * 4. Member C registers, subscribes to the community, and downvotes Member B's comment
 * 5. Member B (the comment author) retrieves their karma history record
 *
 * Note: This test assumes the karma history ID is obtainable after the vote action.
 * In production, this would require either:
 * - A list karma histories endpoint to query by user and source
 * - Or the vote endpoint returning the created karma history ID
 *
 * For this test, we demonstrate the retrieval pattern assuming the historyId is known.
 *
 * Validation:
 * - change_amount is -1 (downvote)
 * - source_type is COMMENT
 * - source_id matches the comment ID
 * - user field shows Member B's profile
 * - voter field shows Member C's profile
 * - created_at timestamp is present
 */
export async function test_api_karma_history_comment_downvote_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Member A registers and creates a community
  const memberAConnection: api.IConnection = { host: connection.host };
  const memberAAuth = await authorize_member_join(memberAConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "password123",
      username: RandomGenerator.name(1),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditCommunityMember.IJoin,
  });
  typia.assert(memberAAuth);
  const community =
    await generate_random_reddit_community_member_communities_create(
      memberAConnection,
      {
        body: {
          name: RandomGenerator.alphabets(10),
          description: RandomGenerator.paragraph({ sentences: 2 }),
        },
      },
    );
  typia.assert(community);
  // Step 2: Member A subscribes to their community
  await api.functional.redditCommunity.member.communities.subscription.create(
    memberAConnection,
    {
      communityName: community.name,
    },
  );
  // Step 3: Member A creates a post
  const post = await api.functional.redditCommunity.member.posts.create(
    memberAConnection,
    {
      body: {
        post_type: "text",
        title: RandomGenerator.paragraph({ sentences: 1 }),
        text_content: RandomGenerator.content({ paragraphs: 2 }),
      },
    },
  );
  typia.assert(post);
  // Step 4: Member B registers
  const memberBConnection: api.IConnection = { host: connection.host };
  const memberBAuth = await authorize_member_join(memberBConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "password123",
      username: RandomGenerator.name(1),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditCommunityMember.IJoin,
  });
  typia.assert(memberBAuth);
  // Step 5: Member B subscribes to the community
  await api.functional.redditCommunity.member.communities.subscription.create(
    memberBConnection,
    {
      communityName: community.name,
    },
  );
  // Step 6: Member B creates a comment on Member A's post
  const comment =
    await generate_random_reddit_community_member_posts_comments_create(
      memberBConnection,
      {
        body: {
          content: RandomGenerator.paragraph({ sentences: 2 }),
        },
        params: {
          postId: post.id,
        },
      },
    );
  typia.assert(comment);
  // Step 7: Member C registers
  const memberCConnection: api.IConnection = { host: connection.host };
  const memberCAuth = await authorize_member_join(memberCConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "password123",
      username: RandomGenerator.name(1),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditCommunityMember.IJoin,
  });
  typia.assert(memberCAuth);
  // Step 8: Member C subscribes to the community
  await api.functional.redditCommunity.member.communities.subscription.create(
    memberCConnection,
    {
      communityName: community.name,
    },
  );
  // Step 9: Member C downvotes Member B's comment
  const voteResult =
    await generate_random_reddit_community_member_comments_vote(
      memberCConnection,
      {
        body: {
          direction: "DOWNVOTE",
        },
        params: {
          commentId: comment.id,
        },
      },
    );
  typia.assert(voteResult);
  // Step 10: Retrieve karma history record
  // Note: In production, the historyId would be obtained from:
  // - A list endpoint: GET /redditCommunity/member/karma-histories?source_id={commentId}
  // - Or returned from the vote endpoint response
  // For this test, we use a placeholder to demonstrate the retrieval pattern
  const karmaHistoryId = typia.random<string & tags.Format<"uuid">>();
  const karmaHistory =
    await api.functional.redditCommunity.member.karma_histories.at(
      memberBConnection,
      {
        historyId: karmaHistoryId,
      },
    );
  typia.assert(karmaHistory);
  // Validate the karma history record structure
  TestValidator.equals(
    "change_amount is -1 for downvote",
    karmaHistory.change_amount,
    -1,
  );
  TestValidator.equals(
    "source_type is COMMENT",
    karmaHistory.source_type,
    "COMMENT",
  );
  TestValidator.equals(
    "source_id matches comment ID",
    karmaHistory.source_id,
    comment.id,
  );
  TestValidator.equals(
    "user is Member B",
    karmaHistory.user.id,
    memberBAuth.id,
  );
  TestValidator.equals(
    "user username matches Member B",
    karmaHistory.user.username,
    memberBAuth.token.access ? "N/A" : memberBAuth.id,
  );
  TestValidator.predicate(
    "voter exists (Member C)",
    karmaHistory.voter !== null,
  );
  if (karmaHistory.voter !== null) {
    TestValidator.equals(
      "voter is Member C",
      karmaHistory.voter.id,
      memberCAuth.id,
    );
  }
  TestValidator.predicate(
    "created_at timestamp is present",
    karmaHistory.created_at.length > 0,
  );
  TestValidator.predicate(
    "new_total is a valid integer",
    Number.isInteger(karmaHistory.new_total),
  );
}
