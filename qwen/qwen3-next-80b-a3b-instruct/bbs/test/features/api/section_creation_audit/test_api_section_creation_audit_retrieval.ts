import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconomicBoardAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardAdministrator";
import type { IEconomicBoardSectionCreation } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardSectionCreation";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEconomicBoardSectionCreation } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEconomicBoardSectionCreation";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

export async function test_api_section_creation_audit_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // Regular administrator retrieves the paginated audit log of section creation events
  // 1. Admin joins to become administrator
  // 2. Admin retrieves audit log of section creation events with pagination validation
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "SecurePass123!",
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
    } satisfies IEconomicBoardAdministrator.IJoin,
  });
  const auditResponse =
    await api.functional.economicBoard.administrator.audit.creations.index(
      adminConnection,
    );
  typia.assert(auditResponse);
  // Validate pagination structure
  TestValidator.predicate(
    "current page >= 1",
    auditResponse.pagination.current >= 1,
  );
  TestValidator.predicate("limit > 0", auditResponse.pagination.limit > 0);
  TestValidator.predicate(
    "records >= 0",
    auditResponse.pagination.records >= 0,
  );
  TestValidator.predicate("pages >= 0", auditResponse.pagination.pages >= 0);
  // Validate audit entries structure
  TestValidator.predicate(
    "audit data is array",
    Array.isArray(auditResponse.data),
  );
}
