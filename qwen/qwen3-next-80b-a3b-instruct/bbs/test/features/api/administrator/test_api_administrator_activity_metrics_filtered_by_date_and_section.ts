import api from "@ORGANIZATION/PROJECT-api";
import type { IAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IAdministrator";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconomicBoardAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardAdministrator";
import type { IEconomicBoardAdministratorAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardAdministratorAuditLog";
import type { IEconomicBoardArticleView } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardArticleView";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEconomicBoardArticleView } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEconomicBoardArticleView";
import type { IUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IUser";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

export async function test_api_administrator_activity_metrics_filtered_by_date_and_section(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create super administrator account
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdminEmail = typia.random<string & tags.Format<"email">>();
  const superAdminPassword = RandomGenerator.alphaNumeric(16);
  await authorize_administrator_join(superAdminConnection, {
    body: {
      email: superAdminEmail,
      password: superAdminPassword,
    } satisfies IEconomicBoardAdministrator.IJoin,
  });
  // 2. Log in as super administrator to access activity metrics endpoint
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_login(adminConnection, {
    body: {
      email: superAdminEmail,
      password: superAdminPassword,
    } satisfies IEconomicBoardAdministrator.ILogin,
  });
  // 3. Prepare a valid IEconomicBoardAdministratorAuditLog request body
  // Since the endpoint requires this type and startDate, endDate, sectionId are not part of it,
  // we provide a minimal valid object with required properties
  const requestBody: IEconomicBoardAdministratorAuditLog = {
    id: typia.random<string & tags.Format<"uuid">>(),
    actor_id: typia.random<string & tags.Format<"uuid">>(),
    action_type: "delete_article", // any valid action type
    ip_address: "127.0.0.1",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    reason: null,
    target_id: null,
    actor: {
      id: typia.random<string & tags.Format<"uuid">>(),
      email: superAdminEmail,
      display_name: null,
      bio: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    } satisfies IAdministrator.ISummary,
    target: null,
  };
  // 4. Call the activity reports endpoint
  const result =
    await api.functional.economicBoard.administrator.reports.activity.index(
      adminConnection,
      {
        body: requestBody,
      },
    );
  // 5. Validate response structure with typia.assert
  typia.assert(result);
  // 6. Validate pagination structure
  TestValidator.predicate(
    "response has valid pagination",
    result.pagination.current >= 1,
  );
  TestValidator.predicate(
    "response has valid pagination limit",
    result.pagination.limit > 0,
  );
  TestValidator.predicate(
    "response has valid pagination records",
    result.pagination.records >= 0,
  );
  TestValidator.predicate(
    "response has valid pagination pages",
    result.pagination.pages >= 0,
  );
  // 7. Validate data array (expect at least 0 records)
  TestValidator.predicate(
    "response has data array",
    Array.isArray(result.data),
  );
  // 8. Validate each data item has required structure of IEconomicBoardArticleView
  for (const item of result.data) {
    TestValidator.predicate(
      "item has valid article_id",
      item.article_id.length > 0,
    );
    TestValidator.predicate("item has valid user_id", item.user_id.length > 0);
    TestValidator.predicate(
      "item has valid user_type",
      item.user_type === "citizen" || item.user_type === "administrator",
    );
    TestValidator.predicate(
      "item has valid created_at",
      item.created_at.length > 0,
    );
  }
}
