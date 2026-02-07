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

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

/**
 * Test the successful retrieval of a regular administrator's detailed information.
 * 1. Create an admin account using authorize_admin_join
 * 2. Retrieve the administrator details using the admin's connection
 * 3. Validate response structure and expected values
 */
export async function test_api_admin_retrieve_regular_administrator_details(
  connection: api.IConnection,
): Promise<void> {
  // Create admin connection and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  typia.assert(admin);
  // Retrieve administrator details
  const administratorDetails =
    await api.functional.discussionBoard.admin.administrators.at(
      adminConnection,
      {
        administratorId: admin.id,
      },
    );
  typia.assert(administratorDetails);
  // Validate administrator assignment details
  TestValidator.equals(
    "administrator ID matches",
    administratorDetails.id,
    admin.id,
  );
  TestValidator.equals(
    "grade is regular",
    administratorDetails.grade,
    "regular",
  );
  TestValidator.predicate(
    "administrator is active",
    administratorDetails.is_active,
  );
  // Validate user profile information
  TestValidator.equals(
    "user ID matches",
    administratorDetails.user.id,
    admin.id,
  );
  TestValidator.equals(
    "display name matches",
    administratorDetails.user.display_name,
    admin.display_name,
  );
  // Validate admin authentication details
  TestValidator.predicate(
    "admin details exist",
    administratorDetails.admin !== null,
  );
  if (administratorDetails.admin) {
    TestValidator.equals(
      "admin email matches",
      administratorDetails.admin.email,
      admin.email,
    );
    TestValidator.equals(
      "admin display name matches",
      administratorDetails.admin.display_name,
      admin.display_name,
    );
  }
  // Validate super_admin is null for regular administrator
  TestValidator.equals(
    "super_admin is null",
    administratorDetails.super_admin,
    null,
  );
  // Validate that grade_changed_at is null for newly created administrator
  TestValidator.equals(
    "grade_changed_at is null",
    administratorDetails.grade_changed_at,
    null,
  );
}
