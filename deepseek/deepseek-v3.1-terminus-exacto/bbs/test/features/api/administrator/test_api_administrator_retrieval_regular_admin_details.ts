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
import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";

export async function test_api_administrator_retrieval_regular_admin_details(
  connection: api.IConnection,
): Promise<void> {
  // Create regular administrator account
  const regularAdminConnection: api.IConnection = { host: connection.host };
  const regularAdminPassword = RandomGenerator.alphaNumeric(16);
  const regularAdmin = await authorize_admin_join(regularAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: regularAdminPassword,
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  typia.assert(regularAdmin);
  // Create super administrator account
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdminPassword = RandomGenerator.alphaNumeric(16);
  const superAdmin = await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: superAdminPassword,
      privilege_level: "super_admin",
    } satisfies IDiscussionBoardSuperAdmin.IJoin,
  });
  typia.assert(superAdmin);
  // Authenticate as super administrator using the actual password
  await authorize_super_admin_login(superAdminConnection, {
    body: {
      email: superAdmin.email,
      password: superAdminPassword,
    } satisfies IDiscussionBoardSuperAdmin.ILogin,
  });
  // Retrieve regular administrator details
  const administratorDetails =
    await api.functional.discussionBoard.superAdmin.administrators.at(
      superAdminConnection,
      {
        administratorId: regularAdmin.id,
      },
    );
  typia.assert(administratorDetails);
  // Validate response structure
  TestValidator.equals(
    "grade should be regular",
    administratorDetails.grade,
    "regular",
  );
  TestValidator.predicate(
    "is_active should be true",
    administratorDetails.is_active,
  );
  TestValidator.notEquals(
    "promoted_at should not be null",
    administratorDetails.promoted_at,
    null,
  );
  TestValidator.notEquals(
    "user should be populated",
    administratorDetails.user,
    null,
  );
  TestValidator.notEquals(
    "admin should be populated",
    administratorDetails.admin,
    null,
  );
  TestValidator.equals(
    "super_admin should be null",
    administratorDetails.super_admin,
    null,
  );
  // Validate admin authentication details
  TestValidator.equals(
    "admin id should match",
    administratorDetails.admin!.id,
    regularAdmin.id,
  );
  TestValidator.equals(
    "admin email should match",
    administratorDetails.admin!.email,
    regularAdmin.email,
  );
  TestValidator.equals(
    "admin display_name should match",
    administratorDetails.admin!.display_name,
    regularAdmin.display_name,
  );
  // Validate user profile information
  TestValidator.notEquals(
    "user display_name should not be empty",
    administratorDetails.user.display_name,
    "",
  );
  TestValidator.predicate(
    "user created_at should be valid timestamp",
    !isNaN(new Date(administratorDetails.user.created_at).getTime()),
  );
  TestValidator.predicate(
    "user updated_at should be valid timestamp",
    !isNaN(new Date(administratorDetails.user.updated_at).getTime()),
  );
  // Validate assignment record timestamps
  TestValidator.predicate(
    "created_at should be valid timestamp",
    !isNaN(new Date(administratorDetails.created_at).getTime()),
  );
  TestValidator.predicate(
    "updated_at should be valid timestamp",
    !isNaN(new Date(administratorDetails.updated_at).getTime()),
  );
  TestValidator.predicate(
    "promoted_at should be valid timestamp",
    !isNaN(new Date(administratorDetails.promoted_at).getTime()),
  );
  // Validate business logic
  TestValidator.predicate(
    "promoted_at should be reasonable",
    new Date(administratorDetails.promoted_at) <= new Date(),
  );
}
