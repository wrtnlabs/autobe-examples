import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallSeller";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

export async function test_api_seller_filter_by_approval_status(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin authenticates via join endpoint
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  // 2. Create a new seller account (automatically gets 'pending' approval status)
  const sellerConnection: api.IConnection = { host: connection.host };
  const newSeller = await authorize_seller_join(sellerConnection, {
    body: {
      shop_name: RandomGenerator.name(),
    },
  });
  typia.assert(newSeller);
  // Verify new seller has pending status
  TestValidator.equals(
    "new seller has pending status",
    newSeller.approvalStatus,
    "pending",
  );
  // 3. Call PATCH /shoppingMall/sellers with approval_status='pending' filter
  const pendingSellers = await api.functional.shoppingMall.sellers.index(
    adminConnection,
    {
      body: {
        approval_status: "pending",
      } satisfies IShoppingMallSeller.IRequest,
    },
  );
  typia.assert(pendingSellers);
  // 4. Validate response only contains sellers with approvalStatus='pending'
  TestValidator.predicate(
    "all pending filter results have pending status",
    pendingSellers.data.every((seller) => seller.approvalStatus === "pending"),
  );
  // 5. Verify the newly created seller appears in the filtered results
  TestValidator.predicate(
    "newly created seller is in pending list",
    pendingSellers.data.some((seller) => seller.id === newSeller.id),
  );
  // 6. Test additional status filters: 'approved', 'rejected', 'suspended'
  const approvalStatuses = ["approved", "rejected", "suspended"] as const;
  for (const status of approvalStatuses) {
    const sellers = await api.functional.shoppingMall.sellers.index(
      adminConnection,
      {
        body: {
          approval_status: status,
        } satisfies IShoppingMallSeller.IRequest,
      },
    );
    typia.assert(sellers);
    // 7. Validate each filtered result has matching approval_status
    TestValidator.predicate(
      `all ${status} filter results have ${status} status`,
      sellers.data.every((seller) => seller.approvalStatus === status),
    );
  }
}
