import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IECommerceMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallAdministrator";
import type { IECommerceMallSuperAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallSuperAdministrator";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIECommerceMallSuperAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIECommerceMallSuperAdministrator";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_administrator_join } from "../../../authorize/authorize_super_administrator_join";
import { authorize_super_administrator_login } from "../../../authorize/authorize_super_administrator_login";
import { authorize_super_administrator_refresh } from "../../../authorize/authorize_super_administrator_refresh";

export async function test_api_super_administrator_list_filter_by_date_range(
  connection: api.IConnection,
): Promise<void> {
  // Authenticate as a super administrator
  const adminConnection: api.IConnection = { host: connection.host };
  const authorized: IECommerceMallSuperAdministrator.IAuthorized =
    await authorize_super_administrator_join(adminConnection, {});
  typia.assert(authorized);
  // Test 1: Filter with both from_created_at and to_created_at
  const filteredBoth =
    await api.functional.eCommerceMall.superAdministrator.super_administrators.index(
      adminConnection,
      {
        body: {
          from_created_at: authorized.created_at,
          to_created_at: authorized.created_at,
        } satisfies IECommerceMallSuperAdministrator.IRequest,
      },
    );
  typia.assert(filteredBoth);
  // Test 2: Filter with only from_created_at (unbounded upper)
  const filteredFromOnly =
    await api.functional.eCommerceMall.superAdministrator.super_administrators.index(
      adminConnection,
      {
        body: {
          from_created_at: authorized.created_at,
        } satisfies IECommerceMallSuperAdministrator.IRequest,
      },
    );
  typia.assert(filteredFromOnly);
  // Test 3: Filter with only to_created_at (unbounded lower)
  const filteredToOnly =
    await api.functional.eCommerceMall.superAdministrator.super_administrators.index(
      adminConnection,
      {
        body: {
          to_created_at: authorized.created_at,
        } satisfies IECommerceMallSuperAdministrator.IRequest,
      },
    );
  typia.assert(filteredToOnly);
  // Validate pagination structure for all responses
  TestValidator.predicate(
    "pagination metadata integrity",
    () =>
      filteredBoth.pagination.current >= 1 &&
      filteredBoth.pagination.limit >= 1 &&
      filteredBoth.pagination.pages >= 0 &&
      filteredBoth.pagination.records >= 0 &&
      filteredFromOnly.pagination.current >= 1 &&
      filteredFromOnly.pagination.limit >= 1 &&
      filteredFromOnly.pagination.pages >= 0 &&
      filteredFromOnly.pagination.records >= 0 &&
      filteredToOnly.pagination.current >= 1 &&
      filteredToOnly.pagination.limit >= 1 &&
      filteredToOnly.pagination.pages >= 0 &&
      filteredToOnly.pagination.records >= 0,
  );
}
