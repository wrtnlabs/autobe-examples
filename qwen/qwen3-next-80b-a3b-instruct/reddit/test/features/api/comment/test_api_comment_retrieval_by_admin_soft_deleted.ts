import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityAdmin";
import type { ICommunityComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityComment";
import type { ICommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityMember";
import type { ICommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPost";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_community_member_comments_create } from "../../../generate/generate_random_community_member_comments_create";
import { generate_random_community_member_posts_create } from "../../../generate/generate_random_community_member_posts_create";
import { prepare_random_community_comment } from "../../../prepare/prepare_random_community_comment";
import { prepare_random_community_post } from "../../../prepare/prepare_random_community_post";

export async function test_api_comment_retrieval_by_admin_soft_deleted(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin authentication
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "AdminPass123!",
    } satisfies ICommunityAdmin.IJoin,
  });
  // 2. Member registration
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = "MemberPass123!";
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: memberEmail,
      password: memberPassword,
    } satisfies ICommunityMember.IJoin,
  });
  // 3. Member login (to create post and comment)
  await authorize_member_login(memberConnection, {
    body: {
      email: memberEmail,
      password: memberPassword,
    } satisfies ICommunityMember.ILogin,
  });
  // 4. Member creates a post
  const post = await generate_random_community_member_posts_create(
    memberConnection,
    {
      body: {
        title: RandomGenerator.name(),
        content_type: "text",
        content: RandomGenerator.content({ paragraphs: 2 }),
      } satisfies ICommunityPost.ICreate,
    },
  );
  typia.assert(post);
  // 5. Member creates a comment on the post
  const commentContent = RandomGenerator.paragraph({ sentences: 3 });
  const comment = await generate_random_community_member_comments_create(
    memberConnection,
    {
      body: {
        content: commentContent,
      } satisfies ICommunityComment.ICreate,
    },
  );
  typia.assert(comment);
  // 6. Member updates comment to '[deleted]' — this triggers soft-delete behavior per scenario requirement
  await api.functional.community.member.comments.update(memberConnection, {
    commentId: comment.id,
    body: {
      content: "[deleted]",
    } satisfies ICommunityComment.IUpdate,
  });
  // 7. Admin retrieves the soft-deleted comment
  const retrievedComment = await api.functional.community.admin.comments.at(
    adminConnection,
    {
      commentId: comment.id,
    },
  );
  // Assert that retrievedComment matches complete ICommunityComment structure
  const safeComment = typia.assert<ICommunityComment>(retrievedComment);
  // 8. Validation: Ensure content is '[deleted]' and all metadata is preserved
  // We can only validate properties that exist in the ICommunityComment interface
  // According to the abstract definition in ICommunityComment, the following should exist:
  TestValidator.equals(
    "soft-deleted content",
    safeComment.content,
    "[deleted]",
  );
  // The ID must be preserved
  TestValidator.equals("comment id preserved", safeComment.id, comment.id);
  // The updated_at must have changed
  TestValidator.notEquals(
    "updated_at changed after delete",
    safeComment.updated_at,
    comment.updated_at,
  );
  // The status must be 'deleted'
  TestValidator.equals(
    "status should be 'deleted'",
    safeComment.status,
    "deleted",
  );
  // The deleted_at must not be null (soft-delete)
  TestValidator.predicate(
    "deleted_at should NOT be null",
    () => safeComment.deleted_at !== null,
  );
  // The created_at must be unchanged
  TestValidator.equals(
    "created_at unchanged",
    safeComment.created_at,
    comment.created_at,
  );
}
