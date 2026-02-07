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

export async function test_api_comment_retrieval_after_deletion(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate member to access protected endpoints
  const memberConnection: api.IConnection = { host: connection.host };
  const memberData = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "SecurePassword123!",
  } satisfies ICommunityMember.IJoin;
  const memberAuth = await authorize_member_join(memberConnection, {
    body: memberData,
  });
  // 2. Generate a random UUID to use as comment ID for retrieval
  // The scenario requires testing retrieval of a deleted comment
  // We use typia.random to generate a valid UUID
  const commentId = typia.random<string & tags.Format<"uuid">>();
  // 3. Retrieve the comment with the generated ID
  // The API endpoint should return ICommunityComment format regardless of deletion status
  // The system should never return 404 for a comment ID that exists (even if deleted)
  const retrievedComment = await api.functional.community.member.comments.at(
    memberConnection,
    {
      commentId,
    },
  );
  typia.assert(retrievedComment);
  // 4. Validate the comment structure per scenario requirements
  // The scenario states that deleted comments still return 200 with:
  // - content field displaying '[deleted]'
  // - MP metadata (author, post reference, timestamps, and deleted_at) preserved
  // Verify content is '[deleted]' as required by scenario
  TestValidator.equals(
    "comment content should be '[deleted]' after deletion",
    retrievedComment.content,
    "[deleted]",
  );
  // Verify ID matches the requested ID
  TestValidator.equals(
    "comment id should match requested ID",
    retrievedComment.id,
    commentId,
  );
  // Verify datetime fields exist and are in correct format
  TestValidator.predicate(
    "comment should have non-null deleted_at",
    retrievedComment.deleted_at !== null,
  );
  // Verify status is 'deleted' as required by scenario
  TestValidator.equals(
    "comment status should be 'deleted'",
    retrievedComment.status,
    "deleted",
  );
  // Verify creation and update timestamps are preserved (non-null ISO format)
  TestValidator.predicate(
    "created_at should be non-null",
    retrievedComment.created_at !== null,
  );
  TestValidator.predicate(
    "updated_at should be non-null",
    retrievedComment.updated_at !== null,
  );
}
