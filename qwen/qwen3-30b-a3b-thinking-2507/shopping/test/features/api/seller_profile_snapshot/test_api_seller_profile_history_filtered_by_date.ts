import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSeller";
import type { IEcommerceSellerProfileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSellerProfileSnapshot";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceSellerProfileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceSellerProfileSnapshot";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

export async function test_api_seller_profile_history_filtered_by_date(
  connection: api.IConnection,
): Promise<void> {
  // 1. Seller setup - register as new seller
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerOutput = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
    },
  });
  // 2. Retrieve profile snapshots - no filtering parameters (IRequest is empty)
  const snapshots =
    await api.functional.ecommerce.sellers.seller_profile_snapshots.index(
      sellerConnection,
      {
        sellerId: sellerOutput.id,
        body: {},
      },
    );
  typia.assert(snapshots);
  // 3. Validate response structure
  TestValidator.equals("Should have no snapshots", snapshots.data.length, 0);
  // Verify pagination structure
  TestValidator.equals(
    "Current page should be 1",
    snapshots.pagination.current,
    1,
  );
  TestValidator.equals("Limit should be 10", snapshots.pagination.limit, 10);
  TestValidator.equals("Pages should be 1", snapshots.pagination.pages, 1);
}
