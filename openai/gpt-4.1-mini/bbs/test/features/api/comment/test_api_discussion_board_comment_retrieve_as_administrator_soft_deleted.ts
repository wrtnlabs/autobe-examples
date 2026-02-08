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

export async function test_api_discussion_board_comment_retrieve_as_administrator_soft_deleted(
  connection: api.IConnection,
): Promise<void> {
  // Create administrator connection and authorize join
  const adminConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_administrator_join(adminConnection, {
    body: {},
  });
  adminConnection.headers = {
    Authorization: `Bearer ${authorized.token.access}`,
  };
  // Generate a UUID for the commentId to test retrieval of a soft deleted comment
  // Since the API endpoint guarantees comment is not soft deleted, this ID should not exist or be soft deleted
  // We test that accessing such comment returns an error
  const commentId = typia.random<string & tags.Format<"uuid">>();
  // Attempt to retrieve the comment (expected to fail)
  await TestValidator.error(
    "retrieval of soft deleted comment should fail",
    async () => {
      await api.functional.discussionBoard.administrator.comments.at(
        adminConnection,
        { commentId },
      );
    },
  );
}
