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
import type { ICommunityBbsPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsPost";
import type { ICommunityBbsSection } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsSection";
import { prepare_random_community_bbs_community } from "../../../prepare/prepare_random_community_bbs_community";
import { prepare_random_community_bbs_post } from "../../../prepare/prepare_random_community_bbs_post";
import { prepare_random_community_bbs_comment_edits } from "../../../prepare/prepare_random_community_bbs_comment_edits";
import { prepare_random_community_bbs_comment } from "../../../prepare/prepare_random_community_bbs_comment";
import { generate_random_community_bbs_member_posts_create } from "../../../generate/generate_random_community_bbs_member_posts_create";
import { generate_random_community_bbs_member_comments_create } from "../../../generate/generate_random_community_bbs_member_comments_create";
import { generate_random_community_bbs_member_comment_edits_create } from "../../../generate/generate_random_community_bbs_member_comment_edits_create";
import { generate_random_community_bbs_member_communities_create } from "../../../generate/generate_random_community_bbs_member_communities_create";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
export async function test_api_comment_edit_by_author(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create a new connection and authenticate the member
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
  typia.assert(member);
  // Step 2: Create a community for the post
  const community: ICommunityBbsCommunity =
    await generate_random_community_bbs_member_communities_create(
      memberConnection,
      {
        body: {
          name: RandomGenerator.name(2),
          description: RandomGenerator.paragraph({ sentences: 3 }),
        } satisfies ICommunityBbsCommunity.ICreate,
      },
    );
  typia.assert(community);
  // Step 3: Create a post in the community
  const post: ICommunityBbsPost =
    await generate_random_community_bbs_member_posts_create(memberConnection, {
      body: {
        title: RandomGenerator.name(3),
        community_id: community.id,
        post_type: "text",
      } satisfies ICommunityBbsPost.ICreate,
    });
  typia.assert(post);
  // Step 4: Create a comment on the post
  const originalContent = RandomGenerator.content({ paragraphs: 2 });
  const originalComment: ICommunityBbsComment =
    await generate_random_community_bbs_member_comments_create(
      memberConnection,
      {
        body: {
          post_id: post.id,
          content: originalContent,
        } satisfies ICommunityBbsComment.ICreate,
      },
    );
  typia.assert(originalComment);
  // Step 5: Edit the comment with new content and edit reason
  const editReason = "Fixed typo and added clarification";
  const updatedContent = RandomGenerator.content({ paragraphs: 2 });
  const editRecord: ICommunityBbsCommentEdits =
    await generate_random_community_bbs_member_comment_edits_create(
      memberConnection,
      {
        body: {
          comment_id: originalComment.id,
          new_content: updatedContent,
          edit_reason: editReason,
        } satisfies ICommunityBbsCommentEdits.ICreate,
      },
    );
  typia.assert(editRecord);
  // Step 6: Validate edit record properties
  TestValidator.equals(
    "edit record comment_id matches original comment",
    editRecord.comment_id,
    originalComment.id,
  );
  TestValidator.equals(
    "edit record editor_id matches member id",
    editRecord.editor_id,
    member.id,
  );
  TestValidator.equals(
    "edit record previous_content matches original comment content",
    editRecord.previous_content,
    originalContent,
  );
  TestValidator.equals(
    "edit record new_content matches provided content",
    editRecord.new_content,
    updatedContent,
  );
  TestValidator.equals(
    "edit record edit_reason matches provided reason",
    editRecord.edit_reason,
    editReason,
  );
  // Step 7: Validation of parent comment edit metadata is impossible because ICommunityBbsComment does not expose edit_count or last_edited_at properties
  // According to the provided DTO schema, these properties exist only in the edit record, not on the comment itself.
  // The scenario description is incorrect about parent comment updates - the API does not expose these fields on the comment object.
  // Instead, we validate that the edit record was created successfully with the correct information.
  // This is the only possible validation with the provided schema.
}
