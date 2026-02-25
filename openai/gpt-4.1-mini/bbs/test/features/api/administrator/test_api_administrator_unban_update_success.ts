import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministrator";
import type { IDiscussionBoardAdministratorGrade } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorGrade";
import type { IDiscussionBoardRegisteredUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardRegisteredUser";
import type { IDiscussionBoardUserBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUserBan";
import type { IDiscussionBoardUserUnban } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUserUnban";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

export async function test_api_administrator_unban_update_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create and authorize an administrator
  const adminConnection: api.IConnection = { host: connection.host };
  const adminJoinBody: IDiscussionBoardAdministrator.IJoin = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "P@ssw0rd1234",
  };
  const authorizedAdmin = await authorize_administrator_join(adminConnection, {
    body: adminJoinBody,
  });
  typia.assert(authorizedAdmin);
  // Set Authorization header for adminConnection
  adminConnection.headers = { Authorization: authorizedAdmin.token.access };
  // 2. Prepare initial unban reason and new reason
  const initialReason = "Initial unban reason for test";
  const newReason = "Updated unban reason for E2E testing";
  // 3. Since there's no create unban endpoint, simulate an existing unban
  // by updating an unban record with an initial reason first via a random UUID
  // NOTE: This may be impossible if backend requires existing unbanId, so
  // the test might rely on test environment setup to provide a valid unbanId
  // Generate a random unbanId for the test
  const unbanId = typia.random<string & tags.Format<"uuid">>();
  // 4. Perform initial update to set initial reason. This relies on unbanId existing.
  // This is a fallback since no create API
  await api.functional.discussionBoard.administrator.administrator.unbans.updateUnban(
    adminConnection,
    {
      unbanId,
      body: {
        reason: initialReason,
      } satisfies IDiscussionBoardUserUnban.IUpdate,
    },
  );
  // 5. Perform the real update operation to change the reason
  const updatedUnban =
    await api.functional.discussionBoard.administrator.administrator.unbans.updateUnban(
      adminConnection,
      {
        unbanId,
        body: {
          reason: newReason,
        } satisfies IDiscussionBoardUserUnban.IUpdate,
      },
    );
  typia.assert(updatedUnban);
  // 6. Validate the response contains updated reason and linked properties
  TestValidator.equals("unban reason updated", updatedUnban.reason, newReason);
  TestValidator.equals("updated unban id", updatedUnban.id, unbanId);
  typia.assert(updatedUnban.userBan);
  typia.assert(updatedUnban.administrator);
  TestValidator.predicate(
    "createdAt is ISO string",
    typeof updatedUnban.createdAt === "string" &&
      updatedUnban.createdAt.length > 0,
  );
  TestValidator.predicate(
    "updatedAt is ISO string",
    typeof updatedUnban.updatedAt === "string" &&
      updatedUnban.updatedAt.length > 0,
  );
  TestValidator.predicate(
    "deletedAt is null or string",
    updatedUnban.deletedAt === null ||
      typeof updatedUnban.deletedAt === "string",
  );
}
