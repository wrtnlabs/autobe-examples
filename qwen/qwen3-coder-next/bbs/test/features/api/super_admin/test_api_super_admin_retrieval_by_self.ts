import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";

export async function test_api_super_admin_retrieval_by_self(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create a super admin user using the base connection
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdminData = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    name: RandomGenerator.name(),
  } satisfies IDiscussionBoardSuperAdmin.IJoin;
  const createdSuperAdmin = await authorize_super_admin_join(
    superAdminConnection,
    {
      body: superAdminData,
    },
  );
  typia.assert(createdSuperAdmin);
  // Step 2: Retrieve the super admin's own profile by ID
  // Use the superAdminConnection which is already authorized
  const retrievedSuperAdmin =
    await api.functional.discussionBoard.superAdmin.super_admins.at(
      superAdminConnection,
      {
        superAdminId: createdSuperAdmin.id,
      },
    );
  typia.assert(retrievedSuperAdmin);
  // Step 3: Validate the retrieved super admin profile
  TestValidator.equals(
    "super admin ID matches",
    retrievedSuperAdmin.id,
    createdSuperAdmin.id,
  );
  TestValidator.equals(
    "email matches",
    retrievedSuperAdmin.email,
    createdSuperAdmin.email,
  );
  TestValidator.equals(
    "isSuperAdmin flag matches",
    retrievedSuperAdmin.isSuperAdmin,
    true,
  );
  TestValidator.equals(
    "canPromoteSuperAdmins flag matches",
    retrievedSuperAdmin.canPromoteSuperAdmins,
    createdSuperAdmin.canPromoteSuperAdmins,
  );
  TestValidator.predicate("createdAt is valid", () => {
    const date = new Date(retrievedSuperAdmin.createdAt);
    return !isNaN(date.getTime());
  });
  TestValidator.predicate("updatedAt is valid", () => {
    const date = new Date(retrievedSuperAdmin.updatedAt);
    return !isNaN(date.getTime());
  });
  TestValidator.equals(
    "deletedAt should be null",
    retrievedSuperAdmin.deletedAt,
    null,
  );
}
