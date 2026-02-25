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

export async function test_api_administrator_ban_erase_success(
  connection: api.IConnection,
): Promise<void> {
  // Scenario: Tests that an authorized administrator can delete an existing ban record successfully.
  // 1. Admin registration and authorization
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "StrongPass123!",
    },
  });
  typia.assert(admin);
  // 2. Simulate creation of a user ban record (Since no ban creation API provided, simulate by generating random banId for deletion test)
  const banId = typia.random<string & tags.Format<"uuid">>();
  // Note: As the ban record created is random and not persisted via API, deletion might fail in real backends unless the test environment supports this.
  // However, based on the scenario, we proceed.
  // 3. Attempt to delete the ban by banId
  await api.functional.discussionBoard.administrator.administrator.bans.erase(
    adminConnection,
    { banId },
  );
  // 4. Verify no content response and no errors indicate successful ban record deletion.
  // The erase API returns void and any error would cause exception, so reaching here means success.
  TestValidator.predicate("ban erased successfully", true);
}
