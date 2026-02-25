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

export async function test_api_discussion_board_administrator_at_success_and_not_found(
  connection: api.IConnection,
): Promise<void> {
  // Scenario 1: Successful retrieval of an existing administrator account by its unique identifier
  // 1. Administrator join to get a valid administrator account and token
  const adminJoinConnection: api.IConnection = { host: connection.host };
  const adminAuthorized = await authorize_administrator_join(
    adminJoinConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "secureP@ssw0rd123",
      },
    },
  );
  // 2. Setup authorized connection with the token
  const adminConnection: api.IConnection = { host: connection.host };
  adminConnection.headers = {
    Authorization: `Bearer ${adminAuthorized.token.access}`,
  };
  // 3. Retrieve the administrator using valid id
  const adminDetails = await api.functional.discussionBoard.administrators.at(
    adminConnection,
    {
      administratorId: adminAuthorized.id,
    },
  );
  typia.assert(adminDetails);
  // 4. Basic checks on the retrieved administrator
  TestValidator.equals("administrator id", adminDetails.id, adminAuthorized.id);
  TestValidator.equals(
    "administrator email",
    adminDetails.email,
    adminAuthorized.email,
  );
  TestValidator.equals(
    "administrator deletedAt is null",
    adminDetails.deletedAt,
    null,
  );
  TestValidator.predicate(
    "administrator has createdAt",
    typeof adminDetails.createdAt === "string",
  );
  TestValidator.predicate(
    "administrator has updatedAt",
    typeof adminDetails.updatedAt === "string",
  );
  // Scenario 2: Attempt retrieve with non-existent administratorId
  const nonExistentId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.httpError(
    "non-existent administrator returns 404",
    404,
    async () => {
      await api.functional.discussionBoard.administrators.at(adminConnection, {
        administratorId: nonExistentId,
      });
    },
  );
}
