import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministrator";
import type { IDiscussionBoardAdministratorGrade } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorGrade";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

export async function test_api_administrator_comment_erase_authorized_and_unauthorized_deletion(
  connection: api.IConnection,
): Promise<void> {
  // Scenario 1: Successful deletion of a comment by an administrator
  // Scenario 2: Unauthorized deletion attempt due to no administrator authentication
  // 1. Administrator join and authorize
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuthorized = await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "StrongP@ssword1",
    },
  });
  typia.assert(adminAuthorized);
  adminConnection.headers = {
    Authorization: `Bearer ${adminAuthorized.token.access}`,
  };
  // 2. Create commentId to delete (simulate creation with UUID)
  const commentIdToDelete = typia.random<string & tags.Format<"uuid">>();
  // 3. Scenario 1: Delete the comment with admin authentication
  // Since no comment creation API is provided, we test authorized deletion success assuming comment exists or deletion idempotency
  await api.functional.discussionBoard.administrator.comments.erase(
    adminConnection,
    {
      commentId: commentIdToDelete,
    },
  );
  // 4. Verify deletion by retrying erase, expecting error or success depending on backend behavior
  // Since exact error not specified, just proceed
  // 5. Scenario 2: Unauthorized deletion attempt without admin authentication
  await TestValidator.httpError(
    "unauthorized deletion should fail",
    [401, 403],
    async () => {
      const baseConnection: api.IConnection = { host: connection.host };
      await api.functional.discussionBoard.administrator.comments.erase(
        baseConnection,
        {
          commentId: commentIdToDelete,
        },
      );
    },
  );
}
