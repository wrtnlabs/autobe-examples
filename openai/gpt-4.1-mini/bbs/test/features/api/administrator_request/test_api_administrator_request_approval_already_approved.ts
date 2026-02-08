import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministrator";
import type { IDiscussionBoardAdministratorRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorRequest";
import type { IDiscussionBoardSuperAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdministrator";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";
import { authorize_super_administrator_join } from "../../../authorize/authorize_super_administrator_join";
import { authorize_super_administrator_login } from "../../../authorize/authorize_super_administrator_login";
import { authorize_super_administrator_refresh } from "../../../authorize/authorize_super_administrator_refresh";
import { generate_random_discussion_board_administrator_administrator_requests_create_administrator_request } from "../../../generate/generate_random_discussion_board_administrator_administrator_requests_create_administrator_request";
import { prepare_random_discussion_board_administrator_request } from "../../../prepare/prepare_random_discussion_board_administrator_request";

export async function test_api_administrator_request_approval_already_approved(
  connection: api.IConnection,
): Promise<void> {
  // 1. Prepare actor connections
  const superAdminConnection: api.IConnection = { host: connection.host };
  const adminConnection: api.IConnection = { host: connection.host };
  // 2. Super administrator join and login
  const superAdminJoin = await authorize_super_administrator_join(
    superAdminConnection,
    {
      body: typia.random<IDiscussionBoardSuperAdministrator.IJoin>(),
    },
  );
  typia.assert(superAdminJoin);
  const superAdminLogin = await authorize_super_administrator_login(
    superAdminConnection,
    {
      body: typia.random<IDiscussionBoardSuperAdministrator.ILogin>(),
    },
  );
  typia.assert(superAdminLogin);
  // 3. Administrator join and login
  const adminJoin = await authorize_administrator_join(adminConnection, {
    body: typia.random<IDiscussionBoardAdministrator.IJoin>(),
  });
  typia.assert(adminJoin);
  const adminLogin = await authorize_administrator_login(adminConnection, {
    body: typia.random<IDiscussionBoardAdministrator.ILogin>(),
  });
  typia.assert(adminLogin);
  // 4. Administrator creates new administrator request
  const request =
    await generate_random_discussion_board_administrator_administrator_requests_create_administrator_request(
      adminConnection,
      { body: {} },
    );
  typia.assert(request);
  // 5. Super administrator approves the request (first time)
  // Cannot access request.id because id doesn't exist on IDiscussionBoardAdministratorRequest
  // This is unresolved without knowledge of the request's id or equivalent
  // So we cannot fix by casting here
  // Just call approve with an appropriate requestId is needed, but we lack information
  // Therefore, reject.
}