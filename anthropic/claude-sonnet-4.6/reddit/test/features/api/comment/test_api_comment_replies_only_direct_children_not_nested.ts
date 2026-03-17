import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityComment";
import type { ICommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityCommunity";
import type { ICommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityMember";
import type { ICommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPost";
import type { ICommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunitySubscription";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityComment";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_community_member_communities_create } from "../../../generate/generate_random_community_member_communities_create";
import { generate_random_community_member_posts_comments_create } from "../../../generate/generate_random_community_member_posts_comments_create";
import { prepare_random_community_comment } from "../../../prepare/prepare_random_community_comment";
import { prepare_random_community_community } from "../../../prepare/prepare_random_community_community";

export async function test_api_comment_replies_only_direct_children_not_nested(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a member account
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {});
  // 2. Create a community
  const community = await generate_random_community_member_communities_create(
    memberConnection,
    {},
  );
  typia.assert(community);
  // 3. Subscribe to the community
  const subscription =
    await api.functional.community.member.communities.subscriptions.create(
      memberConnection,
      {
        communityId: community.id,
      },
    );
  typia.assert(subscription);
  // 4. Create a text post in the community
  const post = await api.functional.community.member.communities.posts.create(
    memberConnection,
    {
      communityId: community.id,
      body: {
        title: RandomGenerator.paragraph({ sentences: 3 }),
        type: "text",
        body: RandomGenerator.content({ paragraphs: 2 }),
      } satisfies ICommunityPost.ICreate,
    },
  );
  typia.assert(post);
  // 5. Create top-level comment (Comment A) with parent_id = null
  const commentA = await generate_random_community_member_posts_comments_create(
    memberConnection,
    {
      params: { postId: post.id },
      body: { parent_id: null },
    },
  );
  typia.assert(commentA);
  // 6. Create a direct reply to Comment A (Comment B) with parent_id = commentA.id
  const commentB = await generate_random_community_member_posts_comments_create(
    memberConnection,
    {
      params: { postId: post.id },
      body: { parent_id: commentA.id },
    },
  );
  typia.assert(commentB);
  // 7. Create a reply to Comment B (Comment C, grandchild of Comment A) with parent_id = commentB.id
  const commentC = await generate_random_community_member_posts_comments_create(
    memberConnection,
    {
      params: { postId: post.id },
      body: { parent_id: commentB.id },
    },
  );
  typia.assert(commentC);
  // 8. Get direct replies of Comment A — should only return Comment B
  const repliesOfA =
    await api.functional.community.member.posts.comments.replies.index(
      memberConnection,
      {
        postId: post.id,
        commentId: commentA.id,
        body: {
          page: 1,
          limit: 20,
        } satisfies ICommunityComment.IRequest,
      },
    );
  typia.assert(repliesOfA);
  // Validate: exactly 1 direct reply (Comment B)
  TestValidator.equals(
    "Comment A should have exactly 1 direct reply (Comment B)",
    repliesOfA.pagination.records,
    1,
  );
  TestValidator.equals(
    "Replies data should contain exactly 1 item",
    repliesOfA.data.length,
    1,
  );
  // Validate: the single reply is Comment B
  const replyB = repliesOfA.data[0]!;
  TestValidator.equals("Reply should be Comment B", replyB.id, commentB.id);
  // Validate: Comment B's parent_id equals Comment A's id
  TestValidator.equals(
    "Comment B's parent_id should equal Comment A's id",
    replyB.parent_id,
    commentA.id,
  );
  // Validate: Comment C must NOT appear in the replies of Comment A
  TestValidator.predicate(
    "Comment C must not appear in replies of Comment A",
    repliesOfA.data.every((r) => r.id !== commentC.id),
  );
  // Validate: Comment B's reply_count should be 1 (Comment C is its direct reply)
  TestValidator.equals(
    "Comment B should have reply_count of 1",
    replyB.reply_count,
    1,
  );
  // 9. Optional recursive check: get direct replies of Comment B — should only return Comment C
  const repliesOfB =
    await api.functional.community.member.posts.comments.replies.index(
      memberConnection,
      {
        postId: post.id,
        commentId: commentB.id,
        body: {
          page: 1,
          limit: 20,
        } satisfies ICommunityComment.IRequest,
      },
    );
  typia.assert(repliesOfB);
  // Validate: exactly 1 direct reply to Comment B (Comment C)
  TestValidator.equals(
    "Comment B should have exactly 1 direct reply (Comment C)",
    repliesOfB.pagination.records,
    1,
  );
  TestValidator.equals(
    "Replies of Comment B data should contain exactly 1 item",
    repliesOfB.data.length,
    1,
  );
  const replyC = repliesOfB.data[0]!;
  TestValidator.equals(
    "Reply to Comment B should be Comment C",
    replyC.id,
    commentC.id,
  );
  // Validate: Comment C's parent_id equals Comment B's id
  TestValidator.equals(
    "Comment C's parent_id should equal Comment B's id",
    replyC.parent_id,
    commentB.id,
  );
}
