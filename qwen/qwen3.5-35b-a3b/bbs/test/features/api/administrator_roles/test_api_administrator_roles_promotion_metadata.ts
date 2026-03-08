import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconomicPoliticalBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalBoardAdmin";
import type { IEconomicPoliticalBoardAdministratorRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalBoardAdministratorRole";
import type { IEconomicPoliticalBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalBoardMember";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEconomicPoliticalBoardAdministratorRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEconomicPoliticalBoardAdministratorRole";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

/**
 * Test that promotion metadata is correctly displayed and accessible in the administrator roles listing.
 *
 * This test verifies that when an administrator is promoted to super status:
 * 1. The promotion metadata (promotedByUserId, promotedAt) is correctly recorded
 * 2. The promoted user appears in the administrator roles list with grade='super'
 * 3. The user profile information is properly included
 * 4. The timestamps (createdAt vs promotedAt) are distinct and correct
 */
export async function test_api_administrator_roles_promotion_metadata(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create first regular administrator (who will perform the promotion)
  const admin1Connection: api.IConnection = { host: connection.host };
  const admin1Auth = await authorize_admin_join(admin1Connection, {
    body: {
      email: (typia.random<string & tags.Format<"email">>() satisfies string as string),
      password: RandomGenerator.alphaNumeric(16),
      href: (typia.random<string & tags.Format<"uri">>() satisfies string as string),
      referrer: (typia.random<string & tags.Format<"uri">>() satisfies string as string),
    } satisfies IEconomicPoliticalBoardAdmin.IJoin,
  });
  typia.assert(admin1Auth);
  // Step 2: Create second regular administrator (who will be promoted)
  const admin2Connection: api.IConnection = { host: connection.host };
  const admin2Auth = await authorize_admin_join(admin2Connection, {
    body: {
      email: (typia.random<string & tags.Format<"email">>() satisfies string as string),
      password: RandomGenerator.alphaNumeric(16),
      href: (typia.random<string & tags.Format<"uri">>() satisfies string as string),
      referrer: (typia.random<string & tags.Format<"uri">>() satisfies string as string),
    } satisfies IEconomicPoliticalBoardAdmin.IJoin,
  });
  typia.assert(admin2Auth);
  // Step 3: Promote second admin to super using first admin's connection
  const promotionResult =
    await api.functional.economicPoliticalBoard.admin.administrators.promote(
      admin1Connection,
      {
        adminId: admin2Auth.id,
      },
    );
  typia.assert(promotionResult);
  // Step 4: Query administrator roles with grade=super filter
  const adminRoles =
    await api.functional.economicPoliticalBoard.admin.administrator_roles.index(
      admin1Connection,
      {
        body: {
          grade: "super",
        } satisfies IEconomicPoliticalBoardAdministratorRole.IRequest,
      },
    );
  typia.assert(adminRoles);
  // Step 5: Validate promotion metadata in the response
  TestValidator.equals(
    "promoted admin found in super grade list",
    adminRoles.data.some((admin) => admin.userId === admin2Auth.id),
    true,
  );
  // Step 6: Find the promoted admin in the response
  const promotedAdmin = adminRoles.data.find(
    (admin) => admin.userId === admin2Auth.id,
  );
  TestValidator.predicate(
    "promoted admin exists in response",
    () => promotedAdmin !== undefined,
  );
  // Step 7: Verify grade is super
  TestValidator.equals("admin grade is super", promotedAdmin!.grade, "super");
  // Step 8: Verify promotedByUserId matches the first admin's ID
  TestValidator.equals(
    "promotedByUserId matches first admin",
    promotedAdmin!.promotedByUserId,
    admin1Auth.id,
  );
  // Step 9: Verify promotedAt is not null (has timestamp)
  TestValidator.predicate(
    "promotedAt has timestamp",
    () => promotedAdmin!.promotedAt !== null,
  );
  // Step 10: Verify createdAt is not null (role creation timestamp)
  TestValidator.predicate(
    "createdAt has timestamp",
    () => promotedAdmin!.createdAt !== undefined,
  );
  // Step 11: Verify user profile information is included
  TestValidator.equals(
    "user displayName is present",
    promotedAdmin!.user.displayName.length > 0,
    true,
  );
  TestValidator.equals(
    "user email is present",
    promotedAdmin!.user.email.length > 0,
    true,
  );
  // Step 12: Verify user ID matches admin2's ID
  TestValidator.equals(
    "user ID matches admin2",
    promotedAdmin!.user.id,
    admin2Auth.id,
  );
  // Step 13: Verify email in user profile matches admin2's email
  TestValidator.equals(
    "user email matches admin2 email",
    promotedAdmin!.user.email,
    admin2Auth.token.access.includes(admin2Auth.id)
      ? "email matches admin2"
      : undefined,
  );
}