import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconomicBoardAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardAdministrator";
import type { IEconomicBoardCitizen } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardCitizen";
import type { IEconomicBoardSectionDeletion } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardSectionDeletion";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEconomicBoardSectionDeletion } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEconomicBoardSectionDeletion";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";
import { authorize_citizen_join } from "../../../authorize/authorize_citizen_join";
import { authorize_citizen_login } from "../../../authorize/authorize_citizen_login";
import { authorize_citizen_refresh } from "../../../authorize/authorize_citizen_refresh";

export async function test_api_administrator_section_deletion_audit_access_control(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as administrator
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_login(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
    } satisfies IEconomicBoardAdministrator.ILogin,
  });
  // 2. Verify administrator can access deletion audit endpoint
  const adminAuditResponse =
    await api.functional.economicBoard.administrator.audit.deletions.index(
      adminConnection,
    );
  typia.assert<IPageIEconomicBoardSectionDeletion>(adminAuditResponse);
  // 3. Authenticate as citizen
  const citizenConnection: api.IConnection = { host: connection.host };
  await authorize_citizen_login(citizenConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
    } satisfies IEconomicBoardCitizen.ILogin,
  });
  // 4. Verify citizen cannot access deletion audit endpoint - This should throw a forbidden error with ACCESS_DENIED code
  // We test the business logic of refusal, not the HTTP response code
  await TestValidator.error(
    "citizen should be denied access to section deletion audit",
    async () => {
      await api.functional.economicBoard.administrator.audit.deletions.index(
        citizenConnection,
      );
    },
  );
}
