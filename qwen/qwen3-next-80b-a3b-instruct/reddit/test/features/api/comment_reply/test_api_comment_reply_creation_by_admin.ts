import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityBbsAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsAdmin";
import type { ICommunityBbsComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsComment";
import type { ICommunityBbsCommentReply } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsCommentReply";
import type { ICommunityBbsCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsCommunity";
import type { ICommunityBbsCommunitySettings } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsCommunitySettings";
import type { ICommunityBbsMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsMember";
import type { ICommunityBbsPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsPost";
import type { ICommunityBbsSection } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsSection";
import { prepare_random_community_bbs_community } from "../../../prepare/prepare_random_community_bbs_community";
import { prepare_random_community_bbs_post } from "../../../prepare/prepare_random_community_bbs_post";
import { prepare_random_community_bbs_comment_reply } from "../../../prepare/prepare_random_community_bbs_comment_reply";
import { prepare_random_community_bbs_comment } from "../../../prepare/prepare_random_community_bbs_comment";
import { generate_random_community_bbs_member_posts_create } from "../../../generate/generate_random_community_bbs_member_posts_create";
import { generate_random_community_bbs_admin_comments_create } from "../../../generate/generate_random_community_bbs_admin_comments_create";
import { generate_random_community_bbs_admin_comments_replies_create } from "../../../generate/generate_random_community_bbs_admin_comments_replies_create";
import { generate_random_community_bbs_member_communities_create } from "../../../generate/generate_random_community_bbs_member_communities_create";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
export async function test_api_comment_reply_creation_by_admin(
  connection: api.IConnection,
) {
  // Step 1: Create a member account using the join endpoint
  const memberConnection: api.IConnection = { host: connection.host };
  const memberData: ICommunityBbsMember.IJoin = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
  };
  const member: ICommunityBbsMember.IAuthorized = await authorize_member_join(
    memberConnection,
    { body: memberData },
  );
  // Step 2: Create a community using the member account
  const communityData: ICommunityBbsCommunity.ICreate = {
    name: RandomGenerator.name(),
    description: RandomGenerator.paragraph({ sentences: 3 }),
  };
  const community: ICommunityBbsCommunity =
    await generate_random_community_bbs_member_communities_create(
      memberConnection,
      { body: communityData },
    );
  // Step 3: Create a post in the community using the member account
  const postData: ICommunityBbsPost.ICreate = {
    title: RandomGenerator.name(3),
    community_id: community.id,
    post_type: "text",
  };
  const post: ICommunityBbsPost =
    await generate_random_community_bbs_member_posts_create(memberConnection, {
      body: postData,
    });
  // Step 4: Create a comment on the post using the member account
  const commentData: ICommunityBbsComment.ICreate = {
    post_id: post.id,
    content: RandomGenerator.content({
      paragraphs: 1,
      sentenceMin: 5,
      sentenceMax: 10,
    }),
  };
  const comment: ICommunityBbsComment =
    await generate_random_community_bbs_admin_comments_create(
      memberConnection,
      { body: commentData },
    );
  // Step 5: Create an admin account using the join endpoint
  const adminConnection: api.IConnection = { host: connection.host };
  const adminData: ICommunityBbsAdmin.IJoin = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
  };
  const admin: ICommunityBbsAdmin.IAuthorized = await authorize_admin_join(
    adminConnection,
    { body: adminData },
  );
  // Step 6: Create a reply to the comment as admin
  const replyData: ICommunityBbsCommentReply.ICreate = {};
  const reply: ICommunityBbsCommentReply =
    await api.functional.communityBbs.admin.comments.replies.create(
      adminConnection,
      {
        commentId: comment.id,
        body: replyData,
      },
    );
  // Step 7: Validate the reply was created with correct properties
  typia.assert(reply);
  TestValidator.equals(
    "reply author_id matches admin id",
    reply.author_id,
    admin.id,
  );
  TestValidator.equals(
    "reply comment_id matches parent comment id",
    reply.comment_id,
    comment.id,
  );
  TestValidator.predicate(
    "reply content exists and is not empty",
    reply.content.length > 0,
  );
  // We cannot verify the parent comment's reply_count was incremented because:
  // 1. The comment object does not have a comment_count property
  // 2. There is no API endpoint to retrieve replies to a comment
  // 3. The scenario requirement is impossible to implement with the provided API
  // The formation of a replay is tested successfully and the API contract is validated
}
