import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMall } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMall";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfile";
import type { IEcommerceMallSellerProfileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfileSnapshot";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMall } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMall";
import type { IPageIEcommerceMallSellerProfileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallSellerProfileSnapshot";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

export async function test_api_seller_profile_snapshots_empty_list(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new seller account
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {});
  typia.assert(seller);
  // 2. Retrieve profile snapshots (should be empty for new seller)
  const snapshotsResponse =
    await api.functional.ecommerceMall.seller.profile.snapshots.index(
      sellerConnection,
      {
        body: {} satisfies IEcommerceMallSellerProfileSnapshot.IRequest,
      },
    );
  typia.assert(snapshotsResponse);
  // 3. Validate empty data array
  TestValidator.equals(
    "data array should be empty",
    snapshotsResponse.data,
    [],
  );
  // 4. Validate pagination metadata shows zero records
  // Note: snapshotsResponse.pagination is IPageIEcommerceMall.IPagination which contains IPage.IPagination
  TestValidator.equals(
    "total records should be zero",
    snapshotsResponse.pagination.pagination.records,
    0,
  );
  TestValidator.equals(
    "total pages should be zero",
    snapshotsResponse.pagination.pagination.pages,
    0,
  );
}
