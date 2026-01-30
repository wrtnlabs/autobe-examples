import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityBbsComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsComment";
import type { ICommunityBbsCommentEdits } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsCommentEdits";
import type { ICommunityBbsCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsCommunity";
import type { ICommunityBbsCommunitySettings } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsCommunitySettings";
import type { ICommunityBbsMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsMember";
import type { ICommunityBbsModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsModerator";
import type { ICommunityBbsPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsPost";
import type { ICommunityBbsSection } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsSection";
import { prepare_random_community_bbs_community } from "../../../prepare/prepare_random_community_bbs_community";
import { prepare_random_community_bbs_post } from "../../../prepare/prepare_random_community_bbs_post";
import { prepare_random_community_bbs_comment_edits } from "../../../prepare/prepare_random_community_bbs_comment_edits";
import { prepare_random_community_bbs_comment } from "../../../prepare/prepare_random_community_bbs_comment";
import { generate_random_community_bbs_member_posts_create } from "../../../generate/generate_random_community_bbs_member_posts_create";
import { generate_random_community_bbs_moderator_comments_create } from "../../../generate/generate_random_community_bbs_moderator_comments_create";
import { generate_random_community_bbs_moderator_comment_edits_create } from "../../../generate/generate_random_community_bbs_moderator_comment_edits_create";
import { generate_random_community_bbs_member_communities_create } from "../../../generate/generate_random_community_bbs_member_communities_create";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { authorize_moderator_join } from "../../../authorize/authorize_moderator_join";
import { authorize_moderator_login } from "../../../authorize/authorize_moderator_login";
import { authorize_moderator_refresh } from "../../../authorize/authorize_moderator_refresh";
export async function test_api_comment_edit_by_moderator(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create a new connection and authenticate as a member
  const memberConnection: api.IConnection = { host: connection.host };
  const member: ICommunityBbsMember.IAuthorized = await authorize_member_join(
    memberConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
      } satisfies ICommunityBbsMember.IJoin,
    },
  );
  // Step 2: Create a new connection and authenticate as a moderator
  const moderatorConnection: api.IConnection = { host: connection.host };
  const moderator: ICommunityBbsModerator.IAuthorized =
    await authorize_moderator_join(moderatorConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password_hash: RandomGenerator.alphaNumeric(32),
      } satisfies ICommunityBbsModerator.IJoin,
    });
  // Step 3: Create a community for the post
  const community: ICommunityBbsCommunity =
    await generate_random_community_bbs_member_communities_create(
      memberConnection,
      {
        body: {
          name: RandomGenerator.name(),
          description: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies ICommunityBbsCommunity.ICreate,
      },
    );
  // Step 4: Create a post in the community
  const post: ICommunityBbsPost =
    await generate_random_community_bbs_member_posts_create(memberConnection, {
      body: {
        title: RandomGenerator.name(3),
        community_id: community.id,
        post_type: "text",
      } satisfies ICommunityBbsPost.ICreate,
    });
  // Step 5: Create a comment on the post as the member
  const comment: ICommunityBbsComment =
    await generate_random_community_bbs_moderator_comments_create(
      memberConnection,
      {
        body: {
          post_id: post.id,
          content: RandomGenerator.content({
            paragraphs: 1,
            sentenceMin: 5,
            sentenceMax: 10,
          }),
        } satisfies ICommunityBbsComment.ICreate,
      },
    );
  // Step 6: Verify that the edit operation is available and update the comment as moderator
  const editReason = RandomGenerator.name(4);
  const newContent = RandomGenerator.content({
    paragraphs: 1,
    sentenceMin: 5,
    sentenceMax: 10,
  });
  const commentEdit: ICommunityBbsCommentEdits =
    await api.functional.communityBbs.moderator.comment_edits.create(
      moderatorConnection,
      {
        body: {
          comment_id: comment.id,
          new_content: newContent,
          edit_reason: editReason,
        } satisfies ICommunityBbsCommentEdits.ICreate,
      },
    );
  // Step 7: Validate edit record creation and properties
  typia.assert(commentEdit);
  TestValidator.equals(
    "edit record comment_id matches",
    commentEdit.comment_id,
    comment.id,
  );
  TestValidator.equals(
    "edit record editor_id matches moderator",
    commentEdit.editor_id,
    moderator.user_id,
  );
  TestValidator.equals(
    "edit record content matches",
    commentEdit.new_content,
    newContent,
  );
  TestValidator.equals(
    "edit record edit_reason matches",
    commentEdit.edit_reason,
    editReason,
  );
  TestValidator.predicate("edit timestamp is valid", () => {
    const date = new Date(commentEdit.edit_timestamp);
    return !isNaN(date.getTime());
  });
}