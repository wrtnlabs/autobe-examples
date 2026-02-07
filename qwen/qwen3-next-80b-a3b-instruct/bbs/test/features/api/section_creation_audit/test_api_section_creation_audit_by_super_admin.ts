import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconomicBoardSectionCreation } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardSectionCreation";
import type { IEconomicBoardSuperAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardSuperAdministrator";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEconomicBoardSectionCreation } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEconomicBoardSectionCreation";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_administrator_login } from "../../../authorize/authorize_super_administrator_login";
import { authorize_super_administrator_refresh } from "../../../authorize/authorize_super_administrator_refresh";

export async function test_api_section_creation_audit_by_super_admin(
  connection: api.IConnection,
): Promise<void> {
  // Create a new super administrator account using join endpoint
  const superAdminConnection: api.IConnection = { host: connection.host };
  // Generate random credentials for super administrator registration
  const superAdminCredentials = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "StrongPass123!",
  } satisfies IEconomicBoardSuperAdministrator.IJoin;
  // Register the super administrator (no utility available, use SDK directly)
  await api.functional.economicBoard.auth.superAdministrator.join(
    superAdminConnection,
    {
      body: superAdminCredentials,
    },
  );
  // Retrieve the audit log of section creation events
  const auditLog =
    await api.functional.economicBoard.superAdministrator.audit.creations.index(
      superAdminConnection,
    );
  // Validate response structure strictly using schema
  typia.assert<IPageIEconomicBoardSectionCreation.ISummary>(auditLog);
  // Validate pagination structure exists as per schema
  TestValidator.equals(
    "pagination structure exists",
    auditLog.pagination !== undefined,
    true,
  );
  TestValidator.equals(
    "pagination current is valid",
    auditLog.pagination.current >= 1,
    true,
  );
  TestValidator.equals(
    "pagination limit is valid",
    auditLog.pagination.limit > 0,
    true,
  );
  TestValidator.equals(
    "pagination records is valid",
    auditLog.pagination.records >= 0,
    true,
  );
  TestValidator.equals(
    "pagination pages is valid",
    auditLog.pagination.pages >= 0,
    true,
  );
  // Validate data array exists, but no properties can be validated because ISummary = {}
  TestValidator.equals("data array exists", Array.isArray(auditLog.data), true);
}
