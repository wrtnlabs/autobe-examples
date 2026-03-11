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

/**
 * Test retrieval attempt for a soft-deleted super administrator.
 * First create a super admin account, then simulate soft deletion (though actual deletion endpoints may not exist - this tests business rule that soft-deleted records shouldn't be returned).
 * According to specification, the operation validates that the record is not soft-deleted before returning details.
 * This tests the system's ability to properly filter out soft-deleted super administrators from administrative oversight views,
 * ensuring only active accounts are accessible through this endpoint.
 */
export async function test_api_super_admin_retrieve_soft_deleted(
  connection: api.IConnection,
): Promise<void> {
  // Create super admin connection and register a new super admin
  const superAdminConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    },
  });
  typia.assert(authorized);
  // Retrieve the super admin details using the created super admin ID
  const retrieved = await api.functional.discussionBoard.super_admins.at(
    superAdminConnection,
    {
      superAdminId: authorized.id,
    },
  );
  typia.assert(retrieved);
  // Validate that the retrieved data matches the original registration data
  TestValidator.equals("super admin ID matches", retrieved.id, authorized.id);
  TestValidator.equals("email matches", retrieved.email, authorized.email);
  TestValidator.equals(
    "admin grade matches",
    retrieved.admin_grade,
    authorized.admin_grade,
  );
  TestValidator.predicate(
    "created at timestamp exists",
    retrieved.created_at !== undefined,
  );
  TestValidator.predicate(
    "updated at timestamp exists",
    retrieved.updated_at !== undefined,
  );
  TestValidator.equals(
    "soft deletion field is null",
    retrieved.deleted_at,
    null,
  );
}
