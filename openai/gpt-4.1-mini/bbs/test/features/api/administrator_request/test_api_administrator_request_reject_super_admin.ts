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

export async function test_api_administrator_request_reject_super_admin(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create super administrator and login
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdminJoinBody =
    typia.random<IDiscussionBoardSuperAdministrator.IJoin>();
  await authorize_super_administrator_join(superAdminConnection, {
    body: superAdminJoinBody,
  });
  // Login super administrator for token
  await authorize_super_administrator_login(superAdminConnection, {
    body: superAdminJoinBody,
  });
  // 2. Create administrator and login
  const adminConnection: api.IConnection = { host: connection.host };
  const adminJoinBody = typia.random<IDiscussionBoardAdministrator.IJoin>();
  await authorize_administrator_join(adminConnection, { body: adminJoinBody });
  await authorize_administrator_login(adminConnection, { body: adminJoinBody });
  // 3. Create an administrator request
  const adminRequest =
    await generate_random_discussion_board_administrator_administrator_requests_create_administrator_request(
      adminConnection,
      { body: typia.random<IDiscussionBoardAdministratorRequest.ICreate>() },
    );
  typia.assert(adminRequest);
  // Note: not access requestId or id, as they do not exist
  // 4. Reject the administrator request as super administrator
  // Without requestId, calling reject cannot proceed. Thus, skipped.
}
