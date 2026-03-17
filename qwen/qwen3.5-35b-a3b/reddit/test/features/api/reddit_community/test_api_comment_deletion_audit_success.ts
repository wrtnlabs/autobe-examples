import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCommunityComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityComment";
import type { IRedditCommunityCommentDeletion } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommentDeletion";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import type { IRedditCommunityMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMemberSession";
import type { IRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPost";
import type { IRedditCommunityUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityUserProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_comment_deletion_audit_success(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Register a member account
  const joinConnection: api.IConnection = { host: connection.host };
  const joinResponse = await authorize_member_join(joinConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(joinResponse);
  // Step 2: Create authenticated connection with returned token
  const userConnection: api.IConnection = { host: connection.host };
  userConnection.headers = {
    ...joinConnection.headers,
    Authorization: joinResponse.token.access,
  };
  // Step 3: Generate realistic test data with proper UUIDs
  const commentId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  const deletionId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  const postId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // Step 4: Retrieve the deletion record
  const deletionRecord: IRedditCommunityCommentDeletion =
    await api.functional.redditCommunity.comments.deletions.at(userConnection, {
      commentId,
      deletionId,
    });
  typia.assert(deletionRecord);
  // Step 5: Validate the deletion record structure
  TestValidator.equals(
    "deletion record has comment",
    deletionRecord.comment.id,
    commentId,
  );
  TestValidator.equals(
    "deletion record has correct deletion id",
    deletionRecord.id,
    deletionId,
  );
  TestValidator.predicate(
    "deletion timestamp is valid date-time",
    () => !isNaN(Date.parse(deletionRecord.deleted_at)),
  );
  TestValidator.predicate(
    "deletion record has created_at",
    () => !isNaN(Date.parse(deletionRecord.created_at)),
  );
  TestValidator.predicate(
    "deletion record has updated_at",
    () => !isNaN(Date.parse(deletionRecord.updated_at)),
  );
  // Step 6: Validate author information exists
  TestValidator.predicate(
    "deletion record has comment author",
    () => deletionRecord.comment.author !== null,
  );
  TestValidator.equals(
    "comment author has id",
    deletionRecord.comment.author.id !== null,
    true,
  );
  TestValidator.equals(
    "comment author has username",
    deletionRecord.comment.author.username.length > 0,
    true,
  );
  // Step 7: Validate deletion session information exists (if available)
  if (
    deletionRecord.deletedBy !== null &&
    deletionRecord.deletedBy !== undefined
  ) {
    TestValidator.equals(
      "deletion session has member",
      deletionRecord.deletedBy.member !== null,
      true,
    );
    TestValidator.equals(
      "deletion session has IP",
      deletionRecord.deletedBy.ip.length > 0,
      true,
    );
    TestValidator.predicate(
      "deletion session has valid expiration",
      () => !isNaN(Date.parse(deletionRecord.deletedBy?.expired_at ?? "")),
    );
  }
  // Step 8: Validate vote score exists
  TestValidator.predicate(
    "comment has vote score",
    () => typeof deletionRecord.comment.voteScore === "number",
  );
  // Step 9: Validate comment summary has id
  TestValidator.predicate(
    "comment has id in summary",
    () => deletionRecord.comment.id.length > 0,
  );
}