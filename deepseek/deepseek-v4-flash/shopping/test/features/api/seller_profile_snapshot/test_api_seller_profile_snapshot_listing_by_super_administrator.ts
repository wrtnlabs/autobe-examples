import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IECommerceMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallAdministrator";
import type { IECommerceMallSellerProfileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallSellerProfileSnapshot";
import type { IECommerceMallSuperAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallSuperAdministrator";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIECommerceMallSellerProfileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIECommerceMallSellerProfileSnapshot";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_administrator_join } from "../../../authorize/authorize_super_administrator_join";
import { authorize_super_administrator_login } from "../../../authorize/authorize_super_administrator_login";
import { authorize_super_administrator_refresh } from "../../../authorize/authorize_super_administrator_refresh";

export async function test_api_seller_profile_snapshot_listing_by_super_administrator(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as superAdministrator
  const superAdminConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_super_administrator_join(
    superAdminConnection,
    {},
  );
  typia.assert(authorized);
  // 2. Call the snapshots listing endpoint with a sellerId
  const sellerId = typia.random<string & tags.Format<"uuid">>();
  const result =
    await api.functional.eCommerceMall.superAdministrator.sellers.profile.snapshots.index(
      superAdminConnection,
      {
        sellerId,
        body: {} satisfies IECommerceMallSellerProfileSnapshot.IRequest,
      },
    );
  typia.assert(result);
  // 3. Validate pagination metadata fields are non-negative
  TestValidator.predicate(
    "pagination fields are non-negative",
    result.pagination.current >= 0 &&
      result.pagination.limit >= 0 &&
      result.pagination.records >= 0 &&
      result.pagination.pages >= 0,
  );
  // 4. Validate ordering by created_at descending (newest first)
  if (result.data.length > 1) {
    for (let i = 1; i < result.data.length; i++) {
      TestValidator.predicate(
        `snapshot[${i - 1}] created_at >= snapshot[${i}] created_at`,
        new Date(result.data[i - 1].created_at).getTime() >=
          new Date(result.data[i].created_at).getTime(),
      );
    }
  }
}
