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

export async function test_api_seller_list_filter_by_approval_status(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as super administrator
  const superAdminConnection: api.IConnection = { host: connection.host };
  await authorize_super_administrator_join(superAdminConnection, {});
  // 2. Test filtering by "pending" approval status
  const pendingResult =
    await api.functional.eCommerceMall.superAdministrator.sellers.index(
      superAdminConnection,
      {
        body: {
          approval_status: "pending",
        } satisfies IECommerceMallSeller.IRequest,
      },
    );
  typia.assert(pendingResult);
  // 3. Test filtering by "approved" approval status
  const approvedResult =
    await api.functional.eCommerceMall.superAdministrator.sellers.index(
      superAdminConnection,
      {
        body: {
          approval_status: "approved",
        } satisfies IECommerceMallSeller.IRequest,
      },
    );
  typia.assert(approvedResult);
  // 4. Test filtering by "rejected" approval status
  const rejectedResult =
    await api.functional.eCommerceMall.superAdministrator.sellers.index(
      superAdminConnection,
      {
        body: {
          approval_status: "rejected",
        } satisfies IECommerceMallSeller.IRequest,
      },
    );
  typia.assert(rejectedResult);
}
