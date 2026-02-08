import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministrator";
import type { IDiscussionBoardRegisteredUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardRegisteredUser";
import type { IDiscussionBoardRegisteredUserPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardRegisteredUserPasswordReset";
import type { IDiscussionBoardSuperAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdministrator";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardRegisteredUserPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardRegisteredUserPasswordReset";
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
import { authorize_super_administrator_join } from "../../../authorize/authorize_super_administrator_join";
import { authorize_super_administrator_login } from "../../../authorize/authorize_super_administrator_login";
import { authorize_super_administrator_refresh } from "../../../authorize/authorize_super_administrator_refresh";

export async function test_api_registered_user_password_resets_filter_by_user_role(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create registered user account and admin/super admin accounts
  const registeredUserConnection: api.IConnection = { host: connection.host };
  const adminConnection: api.IConnection = { host: connection.host };
  const superAdminConnection: api.IConnection = { host: connection.host };
  // Assuming IJoin and ILogin are empty interfaces, generate random join/login payloads
  // As empty, just use empty objects
  // Join and login registered user
  const regUserJoinPayload: IDiscussionBoardRegisteredUser.IJoin = {};
  const regUserAuth = await authorize_registered_user_join(
    registeredUserConnection,
    { body: regUserJoinPayload },
  );
  registeredUserConnection.headers = {
    Authorization: regUserAuth.token.access,
  };
  // Join and login administrator
  const adminJoinPayload: IDiscussionBoardAdministrator.IJoin = {};
  const adminAuth = await authorize_administrator_join(adminConnection, {
    body: adminJoinPayload,
  });
  adminConnection.headers = { Authorization: adminAuth.token.access };
  // Join and login super administrator
  const superAdminJoinPayload: IDiscussionBoardSuperAdministrator.IJoin = {};
  const superAdminAuth = await authorize_super_administrator_join(
    superAdminConnection,
    { body: superAdminJoinPayload },
  );
  superAdminConnection.headers = { Authorization: superAdminAuth.token.access };
  // 2. Authorization test - regular registeredUser should NOT access the passwordResets endpoint
  await TestValidator.error("registered user unauthorized access", async () => {
    await api.functional.discussionBoard.registeredUser.passwordResets.index(
      registeredUserConnection,
      {
        body: {},
      },
    );
  });
  // 3. Test administrator access with filtering by user role type if applicable
  // Note: Since IDiscussionBoardRegisteredUserPasswordReset.IRequest is empty, no filters are sent
  // Call passwordResets.index with empty filter to get all tokens
  const adminResponse =
    await api.functional.discussionBoard.registeredUser.passwordResets.index(
      adminConnection,
      {
        body: {},
      },
    );
  typia.assert(adminResponse);
  // Validate pagination fields
  TestValidator.predicate(
    "valid pagination current",
    adminResponse.pagination.current >= 1,
  );
  TestValidator.predicate(
    "valid pagination limit",
    adminResponse.pagination.limit >= 0,
  );
  TestValidator.predicate(
    "valid pagination pages",
    adminResponse.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "valid pagination records",
    adminResponse.pagination.records >= 0,
  );
  // Validate that data array is present
  TestValidator.predicate(
    "data array present",
    Array.isArray(adminResponse.data),
  );
  // 4. Test super administrator access with same query
  const superAdminResponse =
    await api.functional.discussionBoard.registeredUser.passwordResets.index(
      superAdminConnection,
      {
        body: {},
      },
    );
  typia.assert(superAdminResponse);
  // Compare that admin and super admin responses have consistent pagination and data
  TestValidator.equals(
    "pagination equality",
    adminResponse.pagination,
    superAdminResponse.pagination,
  );
  TestValidator.equals(
    "data equality",
    adminResponse.data,
    superAdminResponse.data,
  );
  // 5. Validate at least one record exists for token resets (if zero, that's acceptable but rare)
  if (adminResponse.data.length > 0) {
    // Check at least the structure of one entry (use assertion)
    typia.assert(adminResponse.data[0]);
  }
}
