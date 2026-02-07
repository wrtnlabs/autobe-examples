import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityComment";
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
import { generate_random_community_member_comments_create } from "../../../generate/generate_random_community_member_comments_create";
import { prepare_random_community_comment } from "../../../prepare/prepare_random_community_comment";

export async function test_api_comment_update_by_author(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as member
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuthorized = await authorize_member_join(memberConnection, {
    body: {} satisfies ICommunityMember.IJoin,
  });
  typia.assert(memberAuthorized);
  // 2. Create a comment owned by the authenticated member using utility
  const comment = await generate_random_community_member_comments_create(
    memberConnection,
    {
      body: {} satisfies ICommunityComment.ICreate,
    },
  );
  typia.assert(comment);
  // 3. Validate that the comment is active
  TestValidator.equals("comment should be active", comment.status, "active");
  // 4. Update the comment content (body is empty per DTO)
  const updatedComment = await api.functional.community.member.comments.update(
    memberConnection,
    {
      commentId: comment.id,
      body: {} satisfies ICommunityComment.IUpdate,
    },
  );
  typia.assert(updatedComment);
  // 5. Validate that updated_at changed but other fields did not
  TestValidator.notEquals(
    "updated_at should be different",
    comment.updated_at,
    updatedComment.updated_at,
  );
  TestValidator.equals(
    "comment id should remain the same",
    updatedComment.id,
    comment.id,
  );
  TestValidator.equals(
    "comment created_at should remain the same",
    updatedComment.created_at,
    comment.created_at,
  );
  TestValidator.equals(
    "comment status should remain the same",
    updatedComment.status,
    comment.status,
  );
  // Validate that the author and post references are still present (though their properties cannot be accessed due to empty ISummary)
  // Since ICommunityMember.ISummary and ICommunityPost.ISummary are empty interfaces,
  // we cannot validate any inner properties. We can only verify the references exist.
  TestValidator.predicate(
    "author exists",
    () => updatedComment.author !== null,
  );
  TestValidator.predicate("post exists", () => updatedComment.post !== null);
  // Note: We cannot validate specific properties like id, display_name, is_email_verified, title, content_type
  // because ICommunityMember.ISummary and ICommunityPost.ISummary are empty interfaces with no properties defined.
  // Any attempt to access these properties causes compilation errors, so we must omit them entirely.
}
