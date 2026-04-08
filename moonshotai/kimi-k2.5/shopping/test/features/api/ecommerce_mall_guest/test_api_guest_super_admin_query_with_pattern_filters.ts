import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallGuest";
import type { IEcommerceMallSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSuperAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallGuest";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";

export async function test_api_guest_super_admin_query_with_pattern_filters(
  connection: api.IConnection,
): Promise<void> {
  // 1. Setup: Create super admin connection
  const superAdminConnection: api.IConnection = { host: connection.host };
  await authorize_super_admin_join(superAdminConnection, {});
  // 2. Test IP pattern filter - starts with pattern (192.168.%)
  const ipStartsWithResult: IPageIEcommerceMallGuest.ISummary =
    await api.functional.ecommerceMall.superAdmin.guests.index(
      superAdminConnection,
      {
        body: {
          ipPattern: "192.168.%",
          page: 1,
          limit: 10,
        } satisfies IEcommerceMallGuest.IRequest,
      },
    );
  typia.assert(ipStartsWithResult);
  // 3. Test IP pattern filter - ends with pattern (%.1)
  const ipEndsWithResult: IPageIEcommerceMallGuest.ISummary =
    await api.functional.ecommerceMall.superAdmin.guests.index(
      superAdminConnection,
      {
        body: {
          ipPattern: "%.1",
          page: 1,
          limit: 10,
        } satisfies IEcommerceMallGuest.IRequest,
      },
    );
  typia.assert(ipEndsWithResult);
  // 4. Test IP pattern filter - contains pattern (192.%)
  const ipContainsResult: IPageIEcommerceMallGuest.ISummary =
    await api.functional.ecommerceMall.superAdmin.guests.index(
      superAdminConnection,
      {
        body: {
          ipPattern: "192.%",
          page: 1,
          limit: 10,
        } satisfies IEcommerceMallGuest.IRequest,
      },
    );
  typia.assert(ipContainsResult);
  // 5. Test user agent pattern filter - contains Mozilla
  const userAgentMozillaResult: IPageIEcommerceMallGuest.ISummary =
    await api.functional.ecommerceMall.superAdmin.guests.index(
      superAdminConnection,
      {
        body: {
          userAgentPattern: "%Mozilla%",
          page: 1,
          limit: 10,
        } satisfies IEcommerceMallGuest.IRequest,
      },
    );
  typia.assert(userAgentMozillaResult);
  // 6. Test user agent pattern filter - contains Chrome
  const userAgentChromeResult: IPageIEcommerceMallGuest.ISummary =
    await api.functional.ecommerceMall.superAdmin.guests.index(
      superAdminConnection,
      {
        body: {
          userAgentPattern: "%Chrome%",
          page: 1,
          limit: 10,
        } satisfies IEcommerceMallGuest.IRequest,
      },
    );
  typia.assert(userAgentChromeResult);
  // 7. Test combined IP and user agent patterns
  const combinedResult: IPageIEcommerceMallGuest.ISummary =
    await api.functional.ecommerceMall.superAdmin.guests.index(
      superAdminConnection,
      {
        body: {
          ipPattern: "10.%",
          userAgentPattern: "%Safari%",
          page: 1,
          limit: 10,
        } satisfies IEcommerceMallGuest.IRequest,
      },
    );
  typia.assert(combinedResult);
  // 8. Test pattern with wildcard only (matches all)
  const allResult: IPageIEcommerceMallGuest.ISummary =
    await api.functional.ecommerceMall.superAdmin.guests.index(
      superAdminConnection,
      {
        body: {
          ipPattern: "%",
          page: 1,
          limit: 100,
        } satisfies IEcommerceMallGuest.IRequest,
      },
    );
  typia.assert(allResult);
  // 9. Test that specific non-matching pattern returns no results
  const noMatchResult: IPageIEcommerceMallGuest.ISummary =
    await api.functional.ecommerceMall.superAdmin.guests.index(
      superAdminConnection,
      {
        body: {
          ipPattern: "999.999.999.%",
          page: 1,
          limit: 10,
        } satisfies IEcommerceMallGuest.IRequest,
      },
    );
  typia.assert(noMatchResult);
  TestValidator.equals(
    "Non-matching pattern returns empty data",
    noMatchResult.data.length,
    0,
  );
}
