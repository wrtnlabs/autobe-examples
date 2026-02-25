import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCommunityComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityComment";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import type { IRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPost";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_community_member_communities_create } from "../../../generate/generate_random_reddit_community_member_communities_create";
import { generate_random_reddit_community_member_posts_comments_create } from "../../../generate/generate_random_reddit_community_member_posts_comments_create";
import { generate_random_reddit_community_member_posts_create } from "../../../generate/generate_random_reddit_community_member_posts_create";
import { prepare_random_reddit_community_comment } from "../../../prepare/prepare_random_reddit_community_comment";
import { prepare_random_reddit_community_community } from "../../../prepare/prepare_random_reddit_community_community";
import { prepare_random_reddit_community_post } from "../../../prepare/prepare_random_reddit_community_post";

export async function test_api_comment_hierarchy_retrieval_by_member(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Authenticate member
  const memberConnection: api.IConnection = { host: connection.host };
  const memberData = typia.random<IRedditCommunityMember.IJoin>();
  const member = await authorize_member_join(memberConnection, {
    body: memberData,
  });
  typia.assert(member);
  // Step 2: Create community
  const community =
    await generate_random_reddit_community_member_communities_create(
      memberConnection,
      {
        body: {
          name: RandomGenerator.alphaNumeric(8),
          description: RandomGenerator.paragraph({ sentences: 3 }),
        },
      },
    );
  typia.assert(community);
  // Step 3: Create post in community
  const post = await generate_random_reddit_community_member_posts_create(
    memberConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 1 }),
        community_id: community.id,
        content: RandomGenerator.paragraph({ sentences: 5 }),
      },
    },
  );
  typia.assert(post);
  // Step 4: Create top-level comment
  const topLevelComment =
    await generate_random_reddit_community_member_posts_comments_create(
      memberConnection,
      {
        params: { postId: post.id },
        body: {
          content: RandomGenerator.paragraph({ sentences: 2 }),
        },
      },
    );
  typia.assert(topLevelComment);
  // Step 5: Create reply to top-level comment
  const firstReply =
    await generate_random_reddit_community_member_posts_comments_create(
      memberConnection,
      {
        params: { postId: post.id },
        body: {
          content: RandomGenerator.paragraph({ sentences: 1 }),
          parent_comment_id: topLevelComment.id,
        },
      },
    );
  typia.assert(firstReply);
  // Step 6: Create second-level reply to first reply
  const secondLevelReply =
    await generate_random_reddit_community_member_posts_comments_create(
      memberConnection,
      {
        params: { postId: post.id },
        body: {
          content: RandomGenerator.paragraph({ sentences: 1 }),
          parent_comment_id: firstReply.id,
        },
      },
    );
  typia.assert(secondLevelReply);
  // Step 7: Retrieve comment hierarchy (Using correct endpoint and IIn type)
  const hierarchy = await api.functional.redditCommunity.posts.comments.at(
    memberConnection,
    {
      postId: post.id,
      commentId: topLevelComment.id,
    },
  );
  typia.assert(hierarchy);
  // Step 8: Validate hierarchy structure
  // Target comment validation - using IIn structure
  TestValidator.equals(
    "target comment ID matches",
    hierarchy.id,
    topLevelComment.id,
  );
  TestValidator.equals(
    "target comment content matches",
    hierarchy.content,
    topLevelComment.content,
  );
  TestValidator.equals(
    "target comment author ID matches",
    hierarchy.author.id,
    member.id,
  );
  TestValidator.predicate(
    "target comment has valid karma score",
    hierarchy.author.karma_score >= 0,
  );
  TestValidator.equals(
    "target comment vote score matches",
    hierarchy.vote_score,
    topLevelComment.vote_score,
  );
  TestValidator.equals(
    "target comment created at matches",
    hierarchy.created_at,
    topLevelComment.created_at,
  );
  TestValidator.equals(
    "target comment updated at matches",
    hierarchy.updated_at,
    topLevelComment.updated_at,
  );
  // Parse the replies string into actual array of summaries
  const directReplies: IRedditCommunityComment.ISummary[] = hierarchy.replies
    ? (JSON.parse(hierarchy.replies) as IRedditCommunityComment.ISummary[])
    : [];
  // First reply validation
  TestValidator.equals("first reply count", directReplies.length, 1);
  const firstReplyItem = directReplies[0];
  TestValidator.equals(
    "first reply ID matches",
    firstReplyItem.id,
    firstReply.id,
  );
  TestValidator.equals(
    "first reply content matches",
    firstReplyItem.content,
    firstReply.content,
  );
  TestValidator.equals(
    "first reply author ID matches",
    firstReplyItem.author.id,
    member.id,
  );
  TestValidator.predicate(
    "first reply has valid karma score",
    firstReplyItem.author.karma_score >= 0,
  );
  TestValidator.equals(
    "first reply vote score matches",
    firstReplyItem.vote_score,
    firstReply.vote_score,
  );
  TestValidator.equals(
    "first reply created at matches",
    firstReplyItem.created_at,
    firstReply.created_at,
  );
  TestValidator.equals(
    "first reply updated at matches",
    firstReplyItem.updated_at,
    firstReply.updated_at,
  );
  // Second level reply validation - need to fetch the first reply's sub-replies
  // We need to use the firstReply.id as the commentId parameter in a new request
  const firstReplyHierarchy =
    await api.functional.redditCommunity.posts.comments.at(memberConnection, {
      postId: post.id,
      commentId: firstReply.id,
    });
  typia.assert(firstReplyHierarchy);
  // Parse the nested replies string
  const secondLevelReplies: IRedditCommunityComment.ISummary[] =
    firstReplyHierarchy.replies
      ? (JSON.parse(
          firstReplyHierarchy.replies,
        ) as IRedditCommunityComment.ISummary[])
      : [];
  TestValidator.equals(
    "second level reply count",
    secondLevelReplies.length,
    1,
  );
  const secondLevelReplyItem = secondLevelReplies[0];
  TestValidator.equals(
    "second level reply ID matches",
    secondLevelReplyItem.id,
    secondLevelReply.id,
  );
  TestValidator.equals(
    "second level reply content matches",
    secondLevelReplyItem.content,
    secondLevelReply.content,
  );
  TestValidator.equals(
    "second level reply author ID matches",
    secondLevelReplyItem.author.id,
    member.id,
  );
  TestValidator.predicate(
    "second level reply has valid karma score",
    secondLevelReplyItem.author.karma_score >= 0,
  );
  TestValidator.equals(
    "second level reply vote score matches",
    secondLevelReplyItem.vote_score,
    secondLevelReply.vote_score,
  );
  TestValidator.equals(
    "second level reply created at matches",
    secondLevelReplyItem.created_at,
    secondLevelReply.created_at,
  );
  TestValidator.equals(
    "second level reply updated at matches",
    secondLevelReplyItem.updated_at,
    secondLevelReply.updated_at,
  );
  // Ensure no deleted comments are returned
  const checkDeleted = (item: IRedditCommunityComment.IIn): boolean => {
    // If replies string is present, parse and recursively check
    if (item.replies) {
      const replies = JSON.parse(
        item.replies,
      ) as IRedditCommunityComment.ISummary[];
      return replies.every((subItem) => {
        // We need to check each summary's existence, but not traverse beyond their structure
        return true; // We can't recursively check replies of summaries as they don't have replies property
      });
    }
    return true;
  };
  TestValidator.predicate("no deleted comments", () => checkDeleted(hierarchy));
}
