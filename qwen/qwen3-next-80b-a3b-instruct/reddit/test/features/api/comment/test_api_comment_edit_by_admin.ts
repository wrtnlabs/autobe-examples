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
import { generate_random_community_bbs_admin_comments_create } from "../../../generate/generate_random_community_bbs_admin_comments_create";
import { generate_random_community_bbs_admin_comment_edits_create } from "../../../generate/generate_random_community_bbs_admin_comment_edits_create";
import { generate_random_community_bbs_member_communities_create } from "../../../generate/generate_random_community_bbs_member_communities_create";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
export async function test_api_comment_edit_by_admin(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Authenticate as admin and create admin connection
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies ICommunityBbsAdmin.IJoin,
  });
  typia.assert(admin);
  // Step 2: Authenticate as member and create member connection
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies ICommunityBbsMember.IJoin,
  });
  typia.assert(member);
  // Step 3: Create a community using member connection
  const community =
    await generate_random_community_bbs_member_communities_create(
      memberConnection,
      {
        body: {
          name: RandomGenerator.name(1),
          description: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies ICommunityBbsCommunity.ICreate,
      },
    );
  typia.assert(community);
  // Step 4: Create a post using member connection in the community
  const post = await generate_random_community_bbs_member_posts_create(
    memberConnection,
    {
      body: {
        title: RandomGenerator.paragraph({
          sentences: 3,
          wordMin: 5,
          wordMax: 10,
        }),
        community_id: community.id,
        post_type: "text",
      } satisfies ICommunityBbsPost.ICreate,
    },
  );
  typia.assert(post);
  // Step 5: Create a comment on the post using member connection
  const originalContent = RandomGenerator.content({
    paragraphs: 2,
    sentenceMin: 3,
    sentenceMax: 5,
  });
  const comment = await generate_random_community_bbs_admin_comments_create(
    memberConnection,
    {
      body: {
        post_id: post.id,
        content: originalContent,
      } satisfies ICommunityBbsComment.ICreate,
    },
  );
  typia.assert(comment);
  // Step 6: Edit the comment as admin using admin connection
  const editReason = RandomGenerator.paragraph({
    sentences: 1,
    wordMin: 3,
    wordMax: 8,
  });
  const newContent = RandomGenerator.content({
    paragraphs: 2,
    sentenceMin: 3,
    sentenceMax: 5,
  });
  const editRecord =
    await api.functional.communityBbs.admin.comment_edits.create(
      adminConnection,
      {
        body: {
          comment_id: comment.id,
          new_content: newContent,
          edit_reason: editReason,
        } satisfies ICommunityBbsCommentEdits.ICreate,
      },
    );
  typia.assert(editRecord);
  // Step 7: Validate edit record contents
  TestValidator.equals(
    "edit reason matches provided",
    editRecord.edit_reason,
    editReason,
  );
  TestValidator.equals(
    "new content matches provided",
    editRecord.new_content,
    newContent,
  );
  TestValidator.equals(
    "previous content matches original comment",
    editRecord.previous_content,
    originalContent,
  );
  TestValidator.equals(
    "editor_id matches admin id",
    editRecord.editor_id,
    admin.id,
  );
}
