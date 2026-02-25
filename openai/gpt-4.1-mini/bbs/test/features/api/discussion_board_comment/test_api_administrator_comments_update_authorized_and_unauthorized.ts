import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministrator";
import type { IDiscussionBoardAdministratorGrade } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorGrade";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardArticleTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleTag";
import type { IDiscussionBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardComment";
import type { IDiscussionBoardRegisteredUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardRegisteredUser";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

export async function test_api_administrator_comments_update_authorized_and_unauthorized(
  connection: api.IConnection,
): Promise<void> {
  // Scenario 1: Successful comment update by authorized administrator
  // 1. Administrator joins and authorized connection is prepared
  const adminAuthorized = await authorize_administrator_join(
    { host: connection.host },
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "SecurePassword123!",
      },
    },
  );
  const adminConnection: api.IConnection = {
    host: connection.host,
    headers: {
      Authorization: `Bearer ${adminAuthorized.token.access}`,
    },
  };
  // 2. Prepare a new comment update request
  // For test purpose, generate a random UUID for commentId, and new content
  const commentId = typia.random<string & tags.Format<"uuid">>();
  const newContent = RandomGenerator.paragraph({ sentences: 3 });
  const updateBody: IDiscussionBoardComment.IUpdate = {
    content: newContent,
  };
  // 3. Perform comment update by administrator
  const updatedComment =
    await api.functional.discussionBoard.administrator.comments.update(
      adminConnection,
      {
        commentId: commentId,
        body: updateBody,
      },
    );
  typia.assert(updatedComment);
  // 4. Validate that response content matches the new content
  TestValidator.equals(
    "updated comment content",
    updatedComment.content,
    newContent,
  );
  // 5. Validate updatedAt timestamp is newer than createdAt
  const createdAtDate = new Date(updatedComment.createdAt);
  const updatedAtDate = new Date(updatedComment.updatedAt);
  TestValidator.predicate(
    "updatedAt is later than createdAt",
    updatedAtDate.getTime() > createdAtDate.getTime(),
  );
  // Note: Audit logging check is not possible via public API, assuming internal
  // Scenario 2: Attempt to update comment without administrator privileges
  // Prepare a new connection without authorization
  const guestConnection: api.IConnection = { host: connection.host };
  // Attempt to update the same comment without any authorization
  await TestValidator.httpError(
    "unauthorized update attempt without admin",
    403,
    async () => {
      await api.functional.discussionBoard.administrator.comments.update(
        guestConnection,
        {
          commentId: commentId,
          body: updateBody,
        },
      );
    },
  );
  // Confirm that comment content remains unchanged (re-fetch comment is not possible directly)
}
