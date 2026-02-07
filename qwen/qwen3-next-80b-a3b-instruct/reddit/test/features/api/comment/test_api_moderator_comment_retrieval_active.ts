import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityComment";
import type { ICommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityMember";
import type { ICommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityModerator";
import type { ICommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPost";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_moderator_join } from "../../../authorize/authorize_moderator_join";
import { authorize_moderator_login } from "../../../authorize/authorize_moderator_login";
import { authorize_moderator_refresh } from "../../../authorize/authorize_moderator_refresh";

export async function test_api_moderator_comment_retrieval_active(
  connection: api.IConnection,
): Promise<void> {
  // Authenticate as moderator
  const moderatorConnection: api.IConnection = { host: connection.host };
  await authorize_moderator_join(moderatorConnection, {
    body: {} satisfies ICommunityModerator.IJoin,
  });
  // Generate a random comment ID to retrieve
  const commentId = typia.random<string & tags.Format<"uuid">>();
  // Retrieve the comment (assuming it exists)
  const retrievedComment = await api.functional.community.moderator.comments.at(
    moderatorConnection,
    {
      commentId,
    },
  );
  typia.assert(retrievedComment);
  // Verify active comment characteristics
  TestValidator.equals(
    "comment status is active",
    retrievedComment.status,
    "active",
  );
  TestValidator.equals(
    "comment deleted_at is null",
    retrievedComment.deleted_at,
    null,
  );
  TestValidator.predicate(
    "comment content is not marked as deleted",
    !retrievedComment.content.includes("[deleted]"),
  );
  // Validate author and post summaries exist (typia.assert ensures they're objects)
  TestValidator.predicate(
    "author summary exists",
    retrievedComment.author !== null &&
      typeof retrievedComment.author === "object",
  );
  TestValidator.predicate(
    "post summary exists",
    retrievedComment.post !== null && typeof retrievedComment.post === "object",
  );
}
