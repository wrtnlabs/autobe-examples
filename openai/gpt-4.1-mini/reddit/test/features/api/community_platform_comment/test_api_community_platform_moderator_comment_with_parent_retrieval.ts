import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_moderator_join } from "../../../authorize/authorize_moderator_join";
import { authorize_moderator_login } from "../../../authorize/authorize_moderator_login";
import { authorize_moderator_refresh } from "../../../authorize/authorize_moderator_refresh";

export async function test_api_community_platform_moderator_comment_with_parent_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as a moderator by joining
  const moderatorConnection: api.IConnection = { host: connection.host };
  const auth = await authorize_moderator_join(moderatorConnection, {
    body: {},
  });
  moderatorConnection.headers = { Authorization: auth.token.access };
  // 2. Retrieve a comment known to be a reply to another comment
  // Use a simulated commentId for demonstration (normally this would be a real one)
  const knownReplyCommentId: string = typia.random<
    string & tags.Format<"uuid">
  >();
  let comment = await api.functional.communityPlatform.moderator.comments.at(
    moderatorConnection,
    { commentId: knownReplyCommentId },
  );
  comment = typia.assert(comment);
  const commentAny: any = comment;
  // 3. Verify the parent comment summary is included in the response
  TestValidator.predicate(
    "parent comment summary present",
    commentAny.parent !== undefined && commentAny.parent !== null,
  );
  if (!commentAny.parent) return; // Defensive return if parent does not exist
  // 4. Verify nested replies are present and properly structured
  // For example, check if replies is an array
  TestValidator.predicate(
    "nested replies is array",
    Array.isArray(commentAny.replies),
  );
  // 5. Ensure timestamps and deletion flags for all involved comments are accurate
  // Check required timestamp fields existence and types
  TestValidator.predicate(
    "created_at is string",
    typeof commentAny.created_at === "string",
  );
  TestValidator.predicate(
    "deleted_at is string or null",
    commentAny.deleted_at === null || typeof commentAny.deleted_at === "string",
  );
  TestValidator.predicate(
    "parent created_at is string",
    typeof commentAny.parent.created_at === "string",
  );
  TestValidator.predicate(
    "parent deleted_at is string or null",
    commentAny.parent.deleted_at === null ||
      typeof commentAny.parent.deleted_at === "string",
  );
  // Check children's structure recursively
  function checkRepliesStructure(
    replies: any[] | undefined | null,
  ): void {
    if (!replies) return;
    for (const reply of replies) {
      typia.assert(reply);
      const replyAny: any = reply;
      TestValidator.predicate(
        "reply created_at is string",
        typeof replyAny.created_at === "string",
      );
      TestValidator.predicate(
        "reply deleted_at is string or null",
        replyAny.deleted_at === null || typeof replyAny.deleted_at === "string",
      );
      // Recursively check nested replies
      checkRepliesStructure(replyAny.replies);
    }
  }
  checkRepliesStructure(commentAny.replies);
}
