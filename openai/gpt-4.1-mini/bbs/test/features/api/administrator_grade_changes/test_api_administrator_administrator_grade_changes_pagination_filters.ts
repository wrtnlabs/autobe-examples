import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministrator";
import type { IDiscussionBoardAdministratorGradeChange } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorGradeChange";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardAdministratorGradeChange } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardAdministratorGradeChange";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

export async function test_api_administrator_administrator_grade_changes_pagination_filters(
  connection: api.IConnection,
): Promise<void> {
  // 1. Administrator join and get authorized connection
  const adminConnection: api.IConnection = { host: connection.host };
  const auth = await authorize_administrator_join(adminConnection, {
    body: {},
  });
  adminConnection.headers = { Authorization: auth.token.access };
  // 2. Request administrator grade changes with empty filter
  const page =
    await api.functional.discussionBoard.administrator.administrator_grade_changes.index(
      adminConnection,
      { body: {} },
    );
  typia.assert(page);
  // 3. Unauthorized access test - create dummy connection and expect error
  const dummyConnection: api.IConnection = { host: connection.host };
  await TestValidator.error("unauthorized access", async () => {
    await api.functional.discussionBoard.administrator.administrator_grade_changes.index(
      dummyConnection,
      { body: {} },
    );
  });
}
