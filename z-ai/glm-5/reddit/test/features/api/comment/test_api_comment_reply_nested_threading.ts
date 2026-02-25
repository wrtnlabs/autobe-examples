import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityComment";
import type { ICommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityCommunity";
import type { ICommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityMember";
import type { ICommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPost";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_community_member_comments_replies_create_reply } from "../../../generate/generate_random_community_member_comments_replies_create_reply";
import { generate_random_community_member_communities_create } from "../../../generate/generate_random_community_member_communities_create";
import { generate_random_community_member_communities_posts_create } from "../../../generate/generate_random_community_member_communities_posts_create";
import { generate_random_community_member_posts_comments_create } from "../../../generate/generate_random_community_member_posts_comments_create";
import { prepare_random_community_comment } from "../../../prepare/prepare_random_community_comment";
import { prepare_random_community_community } from "../../../prepare/prepare_random_community_community";
import { prepare_random_community_post } from "../../../prepare/prepare_random_community_post";

/**
 * Test creating deeply nested replies to validate unlimited nesting depth support.
 * This test verifies that the reply endpoint can be called recursively on previously
 * created replies, creating a multi-level thread hierarchy.
 */
export async function test_api_comment_reply_nested_threading(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as a member
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {});
  typia.assert(member);
  // 2. Create a community
  const community = await generate_random_community_member_communities_create(
    memberConnection,
    {},
  );
  typia.assert(community);
  // 3. Create a post within the community
  const post = await generate_random_community_member_communities_posts_create(
    memberConnection,
    {
      params: { communityName: community.name },
    },
  );
  typia.assert(post);
  // 4. Create a top-level comment on the post (depth 0)
  const topLevelComment =
    await generate_random_community_member_posts_comments_create(
      memberConnection,
      {
        params: { postId: post.id },
      },
    );
  typia.assert(topLevelComment);
  // Validate top-level comment has no parent
  TestValidator.equals(
    "top-level comment has no parent",
    topLevelComment.parent,
    null,
  );
  TestValidator.equals(
    "top-level comment references correct post",
    topLevelComment.post.id,
    post.id,
  );
  TestValidator.equals(
    "top-level comment vote score initialized",
    topLevelComment.voteScore,
    0,
  );
  // 5. Create a first-level reply to the comment (depth 1)
  const firstLevelReply =
    await generate_random_community_member_comments_replies_create_reply(
      memberConnection,
      {
        params: { commentId: topLevelComment.id },
      },
    );
  typia.assert(firstLevelReply);
  // Validate first-level reply has correct parent
  TestValidator.equals(
    "first-level reply parent is top-level comment",
    firstLevelReply.parent!.id,
    topLevelComment.id,
  );
  TestValidator.equals(
    "first-level reply references correct post",
    firstLevelReply.post.id,
    post.id,
  );
  TestValidator.equals(
    "first-level reply vote score initialized",
    firstLevelReply.voteScore,
    0,
  );
  // 6. Create a second-level reply to the first-level reply (depth 2)
  const secondLevelReply =
    await generate_random_community_member_comments_replies_create_reply(
      memberConnection,
      {
        params: { commentId: firstLevelReply.id },
      },
    );
  typia.assert(secondLevelReply);
  // Validate second-level reply has correct parent chain
  TestValidator.equals(
    "second-level reply parent is first-level reply",
    secondLevelReply.parent!.id,
    firstLevelReply.id,
  );
  TestValidator.equals(
    "second-level reply references correct post",
    secondLevelReply.post.id,
    post.id,
  );
  TestValidator.equals(
    "second-level reply vote score initialized",
    secondLevelReply.voteScore,
    0,
  );
  // 7. Create a third-level reply to test deeper nesting (depth 3)
  const thirdLevelReply =
    await generate_random_community_member_comments_replies_create_reply(
      memberConnection,
      {
        params: { commentId: secondLevelReply.id },
      },
    );
  typia.assert(thirdLevelReply);
  // Validate third-level reply has correct parent chain
  TestValidator.equals(
    "third-level reply parent is second-level reply",
    thirdLevelReply.parent!.id,
    secondLevelReply.id,
  );
  TestValidator.equals(
    "third-level reply references correct post",
    thirdLevelReply.post.id,
    post.id,
  );
  TestValidator.equals(
    "third-level reply vote score initialized",
    thirdLevelReply.voteScore,
    0,
  );
  // 8. Verify all replies reference the same original post
  TestValidator.equals(
    "all comments reference same post",
    [
      topLevelComment.post.id,
      firstLevelReply.post.id,
      secondLevelReply.post.id,
      thirdLevelReply.post.id,
    ].every((id) => id === post.id),
    true,
  );
  // 9. Validate timestamps are properly set
  TestValidator.predicate(
    "top-level comment created before first-level reply",
    new Date(topLevelComment.createdAt).getTime() <=
      new Date(firstLevelReply.createdAt).getTime(),
  );
  TestValidator.predicate(
    "first-level reply created before second-level reply",
    new Date(firstLevelReply.createdAt).getTime() <=
      new Date(secondLevelReply.createdAt).getTime(),
  );
  TestValidator.predicate(
    "second-level reply created before third-level reply",
    new Date(secondLevelReply.createdAt).getTime() <=
      new Date(thirdLevelReply.createdAt).getTime(),
  );
  // 10. Verify all comments have the same author
  TestValidator.equals(
    "all comments have same author",
    [
      topLevelComment.author.id,
      firstLevelReply.author.id,
      secondLevelReply.author.id,
      thirdLevelReply.author.id,
    ].every((id) => id === member.id),
    true,
  );
  // 11. Verify vote metrics are initialized correctly for all replies
  const allComments = [
    topLevelComment,
    firstLevelReply,
    secondLevelReply,
    thirdLevelReply,
  ];
  for (const comment of allComments) {
    TestValidator.equals("vote score is 0", comment.voteScore, 0);
    TestValidator.equals("upvote count is 0", comment.upvoteCount, 0);
    TestValidator.equals("downvote count is 0", comment.downvoteCount, 0);
  }
  // 12. Verify parent chain is correctly established
  // top-level -> null, first-level -> top-level, second-level -> first-level, third-level -> second-level
  TestValidator.equals(
    "top-level parent is null",
    topLevelComment.parent,
    null,
  );
  TestValidator.equals(
    "first-level parent id",
    firstLevelReply.parent!.id,
    topLevelComment.id,
  );
  TestValidator.equals(
    "second-level parent id",
    secondLevelReply.parent!.id,
    firstLevelReply.id,
  );
  TestValidator.equals(
    "third-level parent id",
    thirdLevelReply.parent!.id,
    secondLevelReply.id,
  );
}
