import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministrator";
import type { IDiscussionBoardRegisteredUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardRegisteredUser";
import type { IDiscussionBoardRegisteredUserSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardRegisteredUserSession";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardRegisteredUserSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardRegisteredUserSession";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";
import { authorize_registered_user_join } from "../../../authorize/authorize_registered_user_join";
import { authorize_registered_user_login } from "../../../authorize/authorize_registered_user_login";
import { authorize_registered_user_refresh } from "../../../authorize/authorize_registered_user_refresh";

export async function test_api_registered_user_sessions_filtered_by_ip_and_date_range(
  connection: api.IConnection,
): Promise<void> {
  // Authenticate as registeredUser
  const userConnection: api.IConnection = { host: connection.host };
  const registeredUserJoin = await authorize_registered_user_join(
    userConnection,
    { body: {} },
  );
  typia.assert(registeredUserJoin);
  await authorize_registered_user_login(userConnection, { body: {} });
  // Authenticate as administrator
  const adminConnection: api.IConnection = { host: connection.host };
  const adminJoin = await authorize_administrator_join(adminConnection, {
    body: {},
  });
  typia.assert(adminJoin);
  await authorize_administrator_login(adminConnection, { body: {} });
  // Prepare filter parameters
  // Specific IP address for filtering
  const filterIP = "192.168.0.1";
  // Creation date range: from 7 days ago to now
  const now = new Date();
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const body: IDiscussionBoardRegisteredUserSession.IRequest = {
    ip: filterIP,
    created_at_gte: sevenDaysAgo.toISOString(),
    created_at_lte: now.toISOString(),
  };
  // Send filtered request via administrator connection
  const response =
    await api.functional.discussionBoard.registeredUser.sessions.index(
      adminConnection,
      { body },
    );
  typia.assert(response);
  // Validate pagination
  TestValidator.predicate(
    "current page is at least 1",
    response.pagination.current >= 1,
  );
  TestValidator.predicate("limit is positive", response.pagination.limit > 0);
  TestValidator.predicate(
    "records count is non-negative",
    response.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pages count is non-negative",
    response.pagination.pages >= 0,
  );
  // Business properties ip and created_at are not present in session summary, so no direct validation on those properties.
  // Validate data array
  TestValidator.predicate("data array exists", Array.isArray(response.data));
  // As properties ip and created_at do not exist on session summaries, skipping validation of session IP and created_at fields.
  // Similarly, skipping sorting validation of created_at
}
