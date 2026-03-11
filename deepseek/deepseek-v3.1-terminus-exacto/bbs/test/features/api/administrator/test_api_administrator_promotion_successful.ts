import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";

export async function test_api_administrator_promotion_successful(
  connection: api.IConnection,
): Promise<void> {
  // Create super administrator connection
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdmin = await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IDiscussionBoardSuperAdmin.IJoin,
  });
  typia.assert(superAdmin);
  // Create regular administrator connection
  const adminConnection: api.IConnection = { host: connection.host };
  const regularAdmin = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  typia.assert(regularAdmin);
  // Verify initial admin_grade is 'regular'
  TestValidator.equals(
    "initial admin grade",
    regularAdmin.admin_grade,
    "regular",
  );
  // Perform promotion using super administrator connection
  const promotedAdmin =
    await api.functional.discussionBoard.superAdmin.administrators.promote(
      superAdminConnection,
      {
        administratorId: regularAdmin.id,
      },
    );
  typia.assert(promotedAdmin);
  // Validate promotion was successful
  TestValidator.equals(
    "admin id remains same",
    promotedAdmin.id,
    regularAdmin.id,
  );
  TestValidator.equals(
    "admin grade updated to super",
    promotedAdmin.admin_grade,
    "super",
  );
  TestValidator.equals(
    "email remains same",
    promotedAdmin.email,
    regularAdmin.email,
  );
  TestValidator.notEquals(
    "updated_at changed",
    promotedAdmin.updated_at,
    regularAdmin.updated_at,
  );
}
