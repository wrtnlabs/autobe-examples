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

export async function test_api_seller_profile_history_listing(
  connection: api.IConnection,
) {
  // 1. Seller account registration
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller: IEcommerceSeller.IAuthorized = await authorize_seller_join(
    sellerConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "1234",
      } satisfies IEcommerceSeller.IJoin,
    },
  );
  typia.assert(seller);
  // 2. Fetch profile snapshots with pagination
  const snapshots =
    await api.functional.ecommerce.sellers.seller_profile_snapshots.index(
      sellerConnection,
      {
        sellerId: seller.id,
        body: {} satisfies IEcommerceSellerProfileSnapshot.IRequest,
      },
    );
  typia.assert(snapshots);
  // 3. Validate pagination structure
  TestValidator.equals("pagination exists", snapshots.pagination?.current, 1);
  TestValidator.equals("pagination records", snapshots.pagination?.records, 0);
  // 4. Validate snapshot data structure
  if (snapshots.data && snapshots.data.length > 0) {
    const snapshot = snapshots.data[0];
    TestValidator.predicate(
      "shop name before valid",
      snapshot.shop_name_before.length > 0,
    );
    TestValidator.predicate(
      "shop name after valid",
      snapshot.shop_name_after.length > 0,
    );
    TestValidator.predicate(
      "description before valid",
      snapshot.description_before.length > 0,
    );
    TestValidator.predicate(
      "description after valid",
      snapshot.description_after.length > 0,
    );
    TestValidator.predicate(
      "timestamp format valid",
      snapshot.created_at.includes("T"),
    );
  }
}
