import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallSellerRegistration } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerRegistration";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
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
import { generate_random_ecommerce_mall_seller_registrations_create } from "../../../generate/generate_random_ecommerce_mall_seller_registrations_create";
import { prepare_random_ecommerce_mall_seller_registration } from "../../../prepare/prepare_random_ecommerce_mall_seller_registration";

export async function test_api_seller_dashboard_summary_retrieval_success(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create seller account
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuthorized = await authorize_seller_join(sellerConnection, {});
  typia.assert(sellerAuthorized);
  // Step 2: Submit seller registration application
  await generate_random_ecommerce_mall_seller_registrations_create(
    sellerConnection,
    {},
  );
  // Step 3: Create admin account
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuthorized = await authorize_admin_join(adminConnection, {});
  typia.assert(adminAuthorized);
  // Step 4: Admin approves the seller
  const updatedSeller =
    await api.functional.ecommerceMall.admin.sellers.status.updateStatus(
      adminConnection,
      {
        sellerId: sellerAuthorized.id,
        body: {
          approvalStatus: "approved",
        } satisfies IEcommerceMallSeller.IUpdateStatus,
      },
    );
  typia.assert(updatedSeller);
  // Step 5: Seller retrieves dashboard summary
  const summary =
    await api.functional.ecommerceMall.seller.dashboard.summary(
      sellerConnection,
    );
  typia.assert(summary);
  // Step 6: Validate all metrics are present and valid
  TestValidator.predicate(
    "totalProducts is non-negative",
    summary.totalProducts >= 0,
  );
  TestValidator.predicate(
    "totalOrderItems is non-negative",
    summary.totalOrderItems >= 0,
  );
  TestValidator.predicate(
    "pendingCancellationRequests is non-negative",
    summary.pendingCancellationRequests >= 0,
  );
  TestValidator.predicate(
    "pendingRefundRequests is non-negative",
    summary.pendingRefundRequests >= 0,
  );
}
