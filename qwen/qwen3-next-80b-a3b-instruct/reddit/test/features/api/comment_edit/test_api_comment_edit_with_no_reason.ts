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
export async function test_api_comment_edit_with_no_reason(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Authenticate member
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
  // Step 2: Create community
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
  // Step 3: Create post in community
  const post: ICommunityBbsPost =
    await generate_random_community_bbs_member_posts_create(memberConnection, {
      body: {
        title: RandomGenerator.paragraph({
          sentences: 1,
          wordMin: 3,
          wordMax: 7,
        }),
        community_id: community.id,
        post_type: "text",
      } satisfies ICommunityBbsPost.ICreate,
    });
  typia.assert(post);
  // Step 4: Create comment on post
  const originalContent = RandomGenerator.content({ paragraphs: 2 });
  const comment: ICommunityBbsComment =
    await generate_random_community_bbs_member_comments_create(
      memberConnection,
      {
        body: {
          post_id: post.id,
          content: originalContent,
        } satisfies ICommunityBbsComment.ICreate,
      },
    );
  typia.assert(comment);
  // Step 5: Edit comment without edit_reason (null/undefined)
  const newContent = RandomGenerator.content({ paragraphs: 3 });
  const edit: ICommunityBbsCommentEdits =
    await api.functional.communityBbs.member.comment_edits.create(
      memberConnection,
      {
        body: {
          comment_id: comment.id,
          new_content: newContent,
          // edit_reason is intentionally omitted (undefined), which should be accepted as null
        } satisfies ICommunityBbsCommentEdits.ICreate,
      },
    );
  typia.assert(edit);
  // Step 6: Verify edit record has correct previous_content and edit_reason is null
  TestValidator.equals(
    "edit previous_content matches original",
    edit.previous_content,
    originalContent,
  );
  TestValidator.equals("edit_reason is null", edit.edit_reason, null);
  // Note: The API does not provide an endpoint to retrieve individual comments by ID (the 'at' function is missing),
  // so we cannot validate that the parent comment's content was updated to the new_content.
  // However, since the edit was recorded successfully with the new_content and previous_content,
  // and the system is designed to update the parent comment automatically when an edit is created,
  // we assume this functionality works as intended.
}
