import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityComment";
import type { ICommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityCommunity";
import type { ICommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityMember";
import type { ICommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPost";
import type { ICommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunitySubscription";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
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

export async function test_api_comment_detail_nested_reply_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new member and set up authenticated connection
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {});
  typia.assert(member);
  // 2. Create a community
  const community = await generate_random_community_member_communities_create(
    memberConnection,
    {},
  );
  typia.assert(community);
  // 3. Subscribe to the community (required before posting)
  const subscription =
    await api.functional.community.member.communities.subscriptions.create(
      memberConnection,
      { communityId: community.id },
    );
  typia.assert(subscription);
  // 4. Create a text post inside the community
  const post = await api.functional.community.member.communities.posts.create(
    memberConnection,
    {
      communityId: community.id,
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        type: "text",
        body: RandomGenerator.paragraph({ sentences: 5 }),
      } satisfies ICommunityPost.ICreate,
    },
  );
  typia.assert(post);
  // 5. Create a top-level comment on the post (no parent_id)
  const topLevelComment =
    await generate_random_community_member_posts_comments_create(
      memberConnection,
      {
        params: { postId: post.id },
      },
    );
  typia.assert(topLevelComment);
  const topLevelCommentId = topLevelComment.id;
  // 6. Create a nested reply referencing the top-level comment's id as parent_id
  const replyContent = RandomGenerator.paragraph({ sentences: 3 });
  const replyComment =
    await generate_random_community_member_posts_comments_create(
      memberConnection,
      {
        body: {
          content: replyContent,
          parent_id: topLevelCommentId,
        },
        params: { postId: post.id },
      },
    );
  typia.assert(replyComment);
  const replyCommentId = replyComment.id;
  // 7. Retrieve the reply comment detail via public endpoint (no auth required)
  const publicConnection: api.IConnection = { host: connection.host };
  const replyDetail = await api.functional.community.posts.comments.at(
    publicConnection,
    {
      postId: post.id,
      commentId: replyCommentId,
    },
  );
  typia.assert(replyDetail);
  // 8. Validate all fields
  // id matches the reply comment id
  TestValidator.equals(
    "reply comment id matches",
    replyDetail.id,
    replyCommentId,
  );
  // post_id matches the post id
  TestValidator.equals("post_id matches", replyDetail.post_id, post.id);
  // parent_id is non-null and equals topLevelCommentId
  TestValidator.predicate(
    "parent_id is non-null",
    replyDetail.parent_id !== null,
  );
  TestValidator.equals(
    "parent_id equals topLevelCommentId",
    replyDetail.parent_id,
    topLevelCommentId,
  );
  // content matches what we used when creating the reply
  TestValidator.equals("content matches", replyDetail.content, replyContent);
  // author.id matches the creating member's id
  TestValidator.equals(
    "author id matches member id",
    replyDetail.author.id,
    member.id,
  );
  // vote_score is 0 (no votes cast)
  TestValidator.predicate("vote_score is 0", replyDetail.vote_score === 0);
  // created_at and updated_at are equal (reply has never been edited)
  TestValidator.equals(
    "created_at equals updated_at (never edited)",
    replyDetail.created_at,
    replyDetail.updated_at,
  );
}
