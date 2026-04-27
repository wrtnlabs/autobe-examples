import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IECommerceMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallAdministrator";
import type { IECommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallSeller";
import type { IECommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallSellerProfile";
import type { IECommerceMallSuperAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallSuperAdministrator";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIECommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIECommerceMallSeller";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_administrator_join } from "../../../authorize/authorize_super_administrator_join";
import { authorize_super_administrator_login } from "../../../authorize/authorize_super_administrator_login";
import { authorize_super_administrator_refresh } from "../../../authorize/authorize_super_administrator_refresh";

export async function test_api_seller_list_search_by_email_and_date_range(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as super administrator
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_super_administrator_join(adminConnection, {});
  // 2. Get baseline - all sellers without filters
  const allSellers: IPageIECommerceMallSeller.ISummary =
    await api.functional.eCommerceMall.superAdministrator.sellers.index(
      adminConnection,
      {
        body: {
          page: 1,
          limit: 100,
        } satisfies IECommerceMallSeller.IRequest,
      },
    );
  typia.assert(allSellers);
  // 3. Test email search with partial match
  const emailSearch: IPageIECommerceMallSeller.ISummary =
    await api.functional.eCommerceMall.superAdministrator.sellers.index(
      adminConnection,
      {
        body: {
          search: RandomGenerator.alphabets(3),
          page: 1,
          limit: 10,
        } satisfies IECommerceMallSeller.IRequest,
      },
    );
  typia.assert(emailSearch);
  // 4. Test date range filtering - wide range from far past to now
  const fromDate = "2020-01-01T00:00:00.000Z" satisfies string as string &
    tags.Format<"date-time">;
  const toDate = new Date().toISOString() satisfies string as string &
    tags.Format<"date-time">;
  const dateFiltered: IPageIECommerceMallSeller.ISummary =
    await api.functional.eCommerceMall.superAdministrator.sellers.index(
      adminConnection,
      {
        body: {
          created_at_from: fromDate,
          created_at_to: toDate,
          page: 1,
          limit: 100,
        } satisfies IECommerceMallSeller.IRequest,
      },
    );
  typia.assert(dateFiltered);
  // 5. Test combining email search with date range
  const combined: IPageIECommerceMallSeller.ISummary =
    await api.functional.eCommerceMall.superAdministrator.sellers.index(
      adminConnection,
      {
        body: {
          search: RandomGenerator.alphabets(3),
          created_at_from: fromDate,
          created_at_to: toDate,
          page: 1,
          limit: 10,
        } satisfies IECommerceMallSeller.IRequest,
      },
    );
  typia.assert(combined);
}
