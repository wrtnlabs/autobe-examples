import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministrator";
import type { IDiscussionBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardComment";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

export async function test_api_discussion_board_comment_retrieve_as_administrator_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Administrator Join & Authorization
  const adminConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_administrator_join(adminConnection, {
    body: {},
  });
  adminConnection.headers = {
    Authorization: `Bearer ${authorized.token.access}`,
  };
  // 2. Define a valid commentId (UUID string)
  const commentId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // 3. Retrieve the comment by admin
  const comment =
    await api.functional.discussionBoard.administrator.comments.at(
      adminConnection,
      { commentId },
    );
  // 4. Validate response structure
  typia.assert(comment);
  // 5. Validate important fields
  // Skipped checking for 'content' property because it does not exist in the schema
  // Check timestamps are valid ISO strings
  if ("created_at" in comment && comment.created_at !== null) {
    TestValidator.predicate(
      "comment created_at is string",
      typeof comment.created_at === "string",
    );
  }
  if ("updated_at" in comment && comment.updated_at !== null) {
    TestValidator.predicate(
      "comment updated_at is string",
      typeof comment.updated_at === "string",
    );
  }
  // Check soft-deleted check: deleted_at should be null or undefined
  if ("deleted_at" in comment) {
    TestValidator.equals("comment not soft deleted", comment.deleted_at, null);
  }
}
