import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconomicBoardAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardAdministrator";
import type { IEconomicBoardBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardBan";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEconomicBoardBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEconomicBoardBan";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

export async function test_api_administrator_ban_list_view(
  connection: api.IConnection,
): Promise<void> {
  // Create administrator connection for authentication
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(adminConnection, {
    body: typia.random<IEconomicBoardAdministrator.IJoin>(),
  });
  // Call the administrator bans endpoint to retrieve paginated ban list
  const bans =
    await api.functional.economicBoard.administrator.bans.get(adminConnection);
  typia.assert(bans);
  // Validate pagination structure
  TestValidator.equals("pagination exists", bans.pagination, bans.pagination);
  TestValidator.predicate(
    "pagination current is at least 1",
    bans.pagination.current >= 1,
  );
  TestValidator.predicate(
    "pagination limit is positive",
    bans.pagination.limit > 0,
  );
  TestValidator.predicate(
    "pagination records is non-negative",
    bans.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages is non-negative",
    bans.pagination.pages >= 0,
  );
  // Validate data array structure
  TestValidator.predicate("data array exists", Array.isArray(bans.data));
  TestValidator.predicate(
    "data items are valid",
    bans.data.every((ban) => ban !== null),
  );
  // Validate each ban summary record structure using the correct type
  bans.data.forEach((ban) => {
    // Use typia.assert to cast the ban to the correct ISummary type
    // No manual validation needed - typia.assert() performs complete validation
    typia.assert<IPageIEconomicBoardBan.ISummary>(ban);
  });
}
