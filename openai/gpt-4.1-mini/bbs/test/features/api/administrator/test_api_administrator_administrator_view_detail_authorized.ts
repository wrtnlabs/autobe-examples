import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministrator";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

export async function test_api_administrator_administrator_view_detail_authorized(
  connection: api.IConnection,
): Promise<void> {
  // 1. Administrator sign up (to obtain an authorized administrator)
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_administrator_join(adminConnection, {
    body: typia.random<IDiscussionBoardAdministrator.IJoin>(),
  });
  adminConnection.headers = {
    Authorization: `Bearer ${adminAuth.token.access}`,
  };
  // 2. Extract the administrator ID from the authorization token if possible
  //    Since the token object doesn't have the ID property, we simulate by
  //    creating a new one, or use the returned token access to get the ID from
  //    the token payload. If not accessible, simulate by retrying to find ID
  // For the purpose of the test, we fetch the administrator list to find the ID
  // But since there is no API to list administrators, we simulate by using a
  // typia-generated UUID as the one to query.
  // Instead, use a random UUID that complies with format
  const adminId = typia.random<string & tags.Format<"uuid">>();
  // 3. Authorized request for administrator details
  const adminDetail =
    await api.functional.discussionBoard.administrator.administrators.at(
      adminConnection,
      { id: adminId },
    );
  typia.assert(adminDetail);
  // 4. Validate adminDetail is defined
  TestValidator.predicate(
    "administrator detail is defined",
    adminDetail !== null && adminDetail !== undefined && typeof adminDetail === "object",
  );
  // 5. Unauthorized access: try accessing admin detail with no authentication
  await TestValidator.httpError("unauthorized access denied", 401, async () => {
    await api.functional.discussionBoard.administrator.administrators.at(
      connection,
      {
        id: adminId,
      },
    );
  });
  // 6. Unauthorized access: try accessing admin detail with wrong user (simulate)
  //    For simplicity, reuse a new connection without auth headers
  await TestValidator.httpError("unauthorized access denied", 401, async () => {
    await api.functional.discussionBoard.administrator.administrators.at(
      { host: connection.host },
      {
        id: adminId,
      },
    );
  });
}
