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
 * Test the successful demotion of a super administrator to regular administrator grade.
 */
export async function test_api_administrator_demote_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate superAdmin1 (demoter) - create account and get auth token
  const superAdmin1Connection: api.IConnection = { host: connection.host };
  const superAdmin1Authorized = await authorize_admin_join(
    superAdmin1Connection,
    {
      body: {
        email: RandomGenerator.alphaNumeric(10) + "@superadmin1.test.com",
        password: RandomGenerator.alphaNumeric(16),
        href: typia.random<
          string & tags.Format<"uri">
        >() satisfies string as string,
        referrer: typia.random<
          string & tags.Format<"uri">
        >() satisfies string as string,
      } satisfies IEconomicPoliticalBoardAdmin.IJoin,
    },
  );
  typia.assert(superAdmin1Authorized);
  // 2. Authenticate superAdmin2 (demotee) - create account and get auth token
  const superAdmin2Connection: api.IConnection = { host: connection.host };
  const superAdmin2Authorized = await authorize_admin_join(
    superAdmin2Connection,
    {
      body: {
        email: RandomGenerator.alphaNumeric(10) + "@superadmin2.test.com",
        password: RandomGenerator.alphaNumeric(16),
        href: typia.random<
          string & tags.Format<"uri">
        >() satisfies string as string,
        referrer: typia.random<
          string & tags.Format<"uri">
        >() satisfies string as string,
      } satisfies IEconomicPoliticalBoardAdmin.IJoin,
    },
  );
  typia.assert(superAdmin2Authorized);
  // 3. Get list of super administrators to find both users
  const listConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(listConnection, {
    body: {
      email: superAdmin1Authorized.token.access,
      password: "",
      href: typia.random<
        string & tags.Format<"uri">
      >() satisfies string as string,
      referrer: typia.random<
        string & tags.Format<"uri">
      >() satisfies string as string,
    },
  });
  const adminRolesResponse =
    await api.functional.economicPoliticalBoard.admin.administrator_roles.index(
      listConnection,
      {
        body: {
          grade: "super",
          limit: 20,
          page: 1,
        } satisfies IEconomicPoliticalBoardAdministratorRole.IRequest,
      },
    );
  typia.assert(adminRolesResponse);
  // Find superAdmin2 in the results by matching userId
  const superAdmin2Record = adminRolesResponse.data.find(
    (record) => record.userId === superAdmin2Authorized.id,
  );
  TestValidator.equals(
    "superAdmin2 found in super admin roles",
    superAdmin2Record !== undefined,
    true,
  );
  TestValidator.equals(
    "superAdmin2 has super grade initially",
    superAdmin2Record!.grade,
    "super" as const,
  );
  // 4. Perform the demotion using superAdmin1's connection
  const demoteConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(demoteConnection, {
    body: {
      email: superAdmin1Authorized.token.access,
      password: "",
      href: typia.random<
        string & tags.Format<"uri">
      >() satisfies string as string,
      referrer: typia.random<
        string & tags.Format<"uri">
      >() satisfies string as string,
    },
  });
  const demoteResponse =
    await api.functional.economicPoliticalBoard.admin.administrators.demote(
      demoteConnection,
      {
        adminId: superAdmin2Record!.id,
      },
    );
  typia.assert(demoteResponse);
  // 5. Verify the response contains the updated administrator record with grade='regular'
  TestValidator.equals(
    "demote response has grade regular",
    demoteResponse.grade,
    "regular" as const,
  );
  // 6. Verify superAdmin2 now has regular administrator privileges
  // Get updated list to verify grade change
  const updatedAdminRoles =
    await api.functional.economicPoliticalBoard.admin.administrator_roles.index(
      demoteConnection,
      {
        body: {
          grade: "regular",
          limit: 20,
          page: 1,
        } satisfies IEconomicPoliticalBoardAdministratorRole.IRequest,
      },
    );
  typia.assert(updatedAdminRoles);
  const superAdmin2RegularRecord = updatedAdminRoles.data.find(
    (record) => record.userId === superAdmin2Authorized.id,
  );
  TestValidator.equals(
    "superAdmin2 now has regular grade record",
    superAdmin2RegularRecord !== undefined,
    true,
  );
  TestValidator.equals(
    "superAdmin2 grade is regular",
    superAdmin2RegularRecord!.grade,
    "regular" as const,
  );
  // 7. Verify superAdmin1 retains super administrator privileges
  const superAdmin1Record = updatedAdminRoles.data.find(
    (record) => record.userId === superAdmin1Authorized.id,
  );
  TestValidator.equals(
    "superAdmin1 still exists in regular list",
    superAdmin1Record !== undefined,
    false,
  ); // superAdmin1 should NOT be in regular list
  // Check superAdmin1 in super list
  const superList =
    await api.functional.economicPoliticalBoard.admin.administrator_roles.index(
      demoteConnection,
      {
        body: {
          grade: "super",
          limit: 20,
          page: 1,
        } satisfies IEconomicPoliticalBoardAdministratorRole.IRequest,
      },
    );
  typia.assert(superList);
  const superAdmin1SuperRecord = superList.data.find(
    (record) => record.userId === superAdmin1Authorized.id,
  );
  TestValidator.equals(
    "superAdmin1 still has super grade",
    superAdmin1SuperRecord !== undefined,
    true,
  );
  TestValidator.equals(
    "superAdmin1 grade is still super",
    superAdmin1SuperRecord!.grade,
    "super" as const,
  );
}
