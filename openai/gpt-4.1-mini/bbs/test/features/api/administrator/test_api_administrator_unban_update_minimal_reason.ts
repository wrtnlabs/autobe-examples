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

export async function test_api_administrator_unban_update_minimal_reason(
  connection: api.IConnection,
): Promise<void> {
  // 1. Administrator join and authorization
  const adminConnection: api.IConnection = { host: connection.host };
  const adminJoinBody: IDiscussionBoardAdministrator.IJoin = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "AdminPass123!",
  };
  const adminAuthorized = await authorize_administrator_join(adminConnection, {
    body: adminJoinBody,
  });
  // adminConnection.headers now set with Authorization
  // 2. Generate a random unban record to update
  const unbanId = typia.random<string & tags.Format<"uuid">>();
  // 3. Test updating unban reason with empty string
  const updateBodyEmpty: IDiscussionBoardUserUnban.IUpdate = {
    reason: "",
  };
  const updatedEmpty =
    await api.functional.discussionBoard.administrator.administrator.unbans.updateUnban(
      adminConnection,
      {
        unbanId,
        body: updateBodyEmpty,
      },
    );
  typia.assert(updatedEmpty);
  // Confirm reason updated (empty)
  TestValidator.equals(
    "reason updated to empty string",
    updatedEmpty.reason,
    "",
  );
  // Confirm audit timestamps
  TestValidator.predicate(
    "updatedAt is valid ISO date",
    !isNaN(Date.parse(updatedEmpty.updatedAt)),
  );
  TestValidator.predicate(
    "createdAt is valid ISO date",
    !isNaN(Date.parse(updatedEmpty.createdAt)),
  );
  // 4. Test updating unban reason with minimal non-empty reason
  const minimalReason = "a";
  const updateBodyMinimal: IDiscussionBoardUserUnban.IUpdate = {
    reason: minimalReason,
  };
  const updatedMinimal =
    await api.functional.discussionBoard.administrator.administrator.unbans.updateUnban(
      adminConnection,
      {
        unbanId,
        body: updateBodyMinimal,
      },
    );
  typia.assert(updatedMinimal);
  TestValidator.equals(
    "reason updated to minimal string",
    updatedMinimal.reason,
    minimalReason,
  );
  // Confirm audit timestamps
  TestValidator.predicate(
    "updatedAt is valid ISO date",
    !isNaN(Date.parse(updatedMinimal.updatedAt)),
  );
  TestValidator.predicate(
    "createdAt is valid ISO date",
    !isNaN(Date.parse(updatedMinimal.createdAt)),
  );
}
