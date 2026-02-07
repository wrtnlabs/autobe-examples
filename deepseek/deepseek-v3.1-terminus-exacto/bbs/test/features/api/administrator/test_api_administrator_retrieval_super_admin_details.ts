import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardAdministratorPromotionApproval } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorPromotionApproval";
import type { IDiscussionBoardSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdmin";
import type { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
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
 * Test successful retrieval of super administrator details by a super administrator.
 * 1. Create a super administrator account using join endpoint
 * 2. Authenticate as a different super administrator
 * 3. Retrieve the administrator details using the created super admin ID
 * 4. Validate response contains complete information with grade 'super', super_admin populated, and admin null
 */
export async function test_api_administrator_retrieval_super_admin_details(
  connection: api.IConnection,
): Promise<void> {
  // Create first super administrator account
  const superAdminConnection1: api.IConnection = { host: connection.host };
  const superAdmin1 = await authorize_super_admin_join(superAdminConnection1, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      privilege_level: "super_admin",
    } satisfies IDiscussionBoardSuperAdmin.IJoin,
  });
  typia.assert(superAdmin1);
  // Create second super administrator account (acting as the requester)
  const superAdminConnection2: api.IConnection = { host: connection.host };
  const superAdmin2 = await authorize_super_admin_join(superAdminConnection2, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      privilege_level: "super_admin",
    } satisfies IDiscussionBoardSuperAdmin.IJoin,
  });
  typia.assert(superAdmin2);
  // Retrieve administrator details using the first super admin's ID
  const administratorDetails =
    await api.functional.discussionBoard.superAdmin.administrators.at(
      superAdminConnection2,
      {
        administratorId: superAdmin1.id,
      },
    );
  typia.assert(administratorDetails);
  // Validate the response structure
  TestValidator.equals(
    "grade should be 'super'",
    administratorDetails.grade,
    "super",
  );
  TestValidator.predicate(
    "is_active should be true",
    administratorDetails.is_active,
  );
  TestValidator.notEquals(
    "super_admin should be populated",
    administratorDetails.super_admin,
    null,
  );
  TestValidator.equals(
    "admin should be null",
    administratorDetails.admin,
    null,
  );
  TestValidator.equals(
    "super_admin email should match",
    administratorDetails.super_admin!.email,
    superAdmin1.email,
  );
  TestValidator.equals(
    "super_admin id should match",
    administratorDetails.super_admin!.id,
    superAdmin1.id,
  );
}
