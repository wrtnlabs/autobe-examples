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

export async function test_api_comment_retrieval_by_active_member(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate member by joining
  const memberConnection: api.IConnection = { host: connection.host };
  const joinResponse = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "SecurePass123!",
    } satisfies ICommunityMember.IJoin,
  });
  typia.assert(joinResponse);
  // 2. Generate a random valid comment ID since we cannot create comments
  const commentId = typia.random<string & tags.Format<"uuid">>();
  // 3. Retrieve the comment by its ID using the authenticated member connection
  const retrievedComment = await api.functional.community.member.comments.at(
    memberConnection,
    {
      commentId, // Use generated comment ID
    },
  );
  typia.assert(retrievedComment);
  // 4. Validate the retrieved comment structure matches ICommunityComment definition
  TestValidator.equals("comments has ID", retrievedComment.id !== null, true);
  TestValidator.equals(
    "comments has content",
    retrievedComment.content !== undefined,
    true,
  );
  TestValidator.equals(
    "comments has created_at",
    retrievedComment.created_at !== null,
    true,
  );
  TestValidator.equals(
    "comments has updated_at",
    retrievedComment.updated_at !== null,
    true,
  );
  TestValidator.equals(
    "comments has status",
    retrievedComment.status !== undefined,
    true,
  );
  TestValidator.equals(
    "comments has author",
    retrievedComment.author !== null,
    true,
  );
  TestValidator.equals(
    "comments has post",
    retrievedComment.post !== null,
    true,
  );
  // Validate author summary structure (based on actual ICommunityMember.ISummary)
  // No properties to validate - ISummary is an empty object {}
  // Validate post summary structure (based on actual ICommunityPost.ISummary)
  // No properties to validate - ISummary is an empty object {}
}
