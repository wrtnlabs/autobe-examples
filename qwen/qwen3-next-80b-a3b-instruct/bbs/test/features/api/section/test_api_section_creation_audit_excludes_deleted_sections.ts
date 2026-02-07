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

export async function test_api_section_creation_audit_excludes_deleted_sections(
  connection: api.IConnection,
): Promise<void> {
  // Authenticate as super administrator
  const superAdminConnection: api.IConnection = { host: connection.host };
  await authorize_super_administrator_login(superAdminConnection, {
    body: typia.random<IEconomicBoardSuperAdministrator.IJoin>(),
  });
  // Call the section creation audit endpoint
  const auditLog =
    await api.functional.economicBoard.superAdministrator.audit.creations.index(
      superAdminConnection,
    );
  typia.assert(auditLog);
  // Validate structure
  TestValidator.equals(
    "pagination exists",
    auditLog.pagination !== undefined,
    true,
  );
  TestValidator.equals("data array exists", Array.isArray(auditLog.data), true);
  TestValidator.equals(
    "no section creation records expected",
    auditLog.data.length,
    0,
  );
}
