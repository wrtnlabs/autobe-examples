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

export async function test_api_registered_user_password_resets_list_default_pagination(
  connection: api.IConnection,
): Promise<void> {
  // Create administrator connection: join and login
  const adminConnection: api.IConnection = { host: connection.host };
  const adminJoin = await authorize_administrator_join(adminConnection, {
    body: {},
  });
  typia.assert(adminJoin);
  await authorize_administrator_login(adminConnection, {
    body: {},
  });
  // Create super administrator connection: join and login
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdminJoin = await authorize_super_administrator_join(
    superAdminConnection,
    {
      body: {},
    },
  );
  typia.assert(superAdminJoin);
  await authorize_super_administrator_login(superAdminConnection, {
    body: {},
  });
  // Call index endpoint without filters, default pagination (admin)
  const adminResponse =
    await api.functional.discussionBoard.registeredUser.passwordResets.index(
      adminConnection,
      { body: {} },
    );
  typia.assert(adminResponse);
  // Validate pagination metadata exists and sensible
  const pagination = adminResponse.pagination;
  TestValidator.predicate(
    "admin pagination current page >= 1",
    pagination.current >= 1,
  );
  TestValidator.predicate("admin pagination limit >= 0", pagination.limit >= 0);
  TestValidator.predicate("admin pagination pages >= 0", pagination.pages >= 0);
  TestValidator.predicate(
    "admin pagination records >= 0",
    pagination.records >= 0,
  );
  // Validate the data array length does not exceed the limit
  TestValidator.predicate(
    "admin data length <= pagination limit",
    adminResponse.data.length <= pagination.limit,
  );
  // Validate data array has multiple records if pagination suggests more than 1 record
  if (pagination.records > 1) {
    TestValidator.predicate(
      "admin data contains multiple records",
      adminResponse.data.length > 1,
    );
  }
  // Verify each data item includes necessary summary properties and excludes sensitive token values
  for (const item of adminResponse.data) {
    typia.assert(item);
    // The schema only asserts the summary, no sensitive token should be present
    // No explicit sensitive token field is defined, so no direct assertion here
  }
  // Call index endpoint with super administrator connection
  const superAdminResponse =
    await api.functional.discussionBoard.registeredUser.passwordResets.index(
      superAdminConnection,
      { body: {} },
    );
  typia.assert(superAdminResponse);
  // Validate pagination metadata for super administrator
  const superPagination = superAdminResponse.pagination;
  TestValidator.predicate(
    "super admin pagination current page >= 1",
    superPagination.current >= 1,
  );
  TestValidator.predicate(
    "super admin pagination limit >= 0",
    superPagination.limit >= 0,
  );
  TestValidator.predicate(
    "super admin pagination pages >= 0",
    superPagination.pages >= 0,
  );
  TestValidator.predicate(
    "super admin pagination records >= 0",
    superPagination.records >= 0,
  );
  // Validate data length does not exceed limit for super administrator
  TestValidator.predicate(
    "super admin data length <= pagination limit",
    superAdminResponse.data.length <= superPagination.limit,
  );
  // Validate data array has multiple records if pagination suggests more than 1 record
  if (superPagination.records > 1) {
    TestValidator.predicate(
      "super admin data contains multiple records",
      superAdminResponse.data.length > 1,
    );
  }
  // Verify each data item for super administrator
  for (const item of superAdminResponse.data) {
    typia.assert(item);
  }
  // Test unauthorized access: logged in as registeredUser, should fail
  const userConnection: api.IConnection = { host: connection.host };
  const userJoin = await authorize_registered_user_join(userConnection, {
    body: {},
  });
  typia.assert(userJoin);
  await authorize_registered_user_login(userConnection, {
    body: {},
  });
  await TestValidator.error(
    "registered user cannot access password resets index",
    async () => {
      await api.functional.discussionBoard.registeredUser.passwordResets.index(
        userConnection,
        { body: {} },
      );
    },
  );
}
