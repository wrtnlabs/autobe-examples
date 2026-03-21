import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfile";
import type { IEcommerceMallSellerSuspension } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerSuspension";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallSellerSuspension } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallSellerSuspension";
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
import { generate_random_ecommerce_mall_admin_seller_suspensions_create } from "../../../generate/generate_random_ecommerce_mall_admin_seller_suspensions_create";
import { prepare_random_ecommerce_mall_seller_suspension } from "../../../prepare/prepare_random_ecommerce_mall_seller_suspension";

export async function test_api_seller_suspension_filter_by_seller(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create admin connection for authentication
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {});
  // 2. Create seller connection for creating test seller to suspend
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {});
  // 3. Suspend the seller to create test suspension record
  const suspension =
    await generate_random_ecommerce_mall_admin_seller_suspensions_create(
      adminConnection,
      {
        body: {
          seller_id: seller.id,
          reason: "Policy violation test suspension",
        },
      },
    );
  typia.assert(suspension);
  // 4. Query suspension records filtered by the specific seller
  const filteredPage =
    await api.functional.ecommerceMall.admin.seller_suspensions.index(
      adminConnection,
      {
        body: {
          seller_id: seller.id,
          limit: 10,
          page: 1,
        } satisfies IEcommerceMallSellerSuspension.IRequest,
      },
    );
  typia.assert(filteredPage);
  // 5. Validate response contains suspension records for that specific seller
  TestValidator.equals(
    "filtered records count >= 1",
    filteredPage.data.length >= 1,
    true,
  );
  TestValidator.equals(
    "pagination records >= 1",
    filteredPage.pagination.records >= 1,
    true,
  );
  // 6. Validate seller information in response matches expected seller
  const targetSuspension = filteredPage.data.find(
    (s) => s.id === suspension.id,
  );
  TestValidator.predicate(
    "suspension found in filtered results",
    targetSuspension !== undefined,
  );
  if (targetSuspension) {
    TestValidator.equals(
      "seller id matches",
      targetSuspension.seller.id,
      seller.id,
    );
    TestValidator.equals(
      "seller email matches",
      targetSuspension.seller.email,
      seller.email,
    );
  }
  // 7. Query with different seller_id should not return our suspension
  const differentSellerId = typia.random<string & tags.Format<"uuid">>();
  const emptyPage =
    await api.functional.ecommerceMall.admin.seller_suspensions.index(
      adminConnection,
      {
        body: {
          seller_id: differentSellerId,
          limit: 10,
          page: 1,
        } satisfies IEcommerceMallSellerSuspension.IRequest,
      },
    );
  typia.assert(emptyPage);
  // Verify the different seller filter returns empty or doesn't include our suspension
  const hasOurSuspension = emptyPage.data.some((s) => s.id === suspension.id);
  TestValidator.equals(
    "different seller filter excludes our suspension",
    hasOurSuspension,
    false,
  );
}
