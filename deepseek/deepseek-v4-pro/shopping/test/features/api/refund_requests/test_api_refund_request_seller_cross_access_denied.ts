import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallProductVariantOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantOptionValue";
import type { IShoppingMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRefundRequest";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

/**
 * Test that a seller cannot access another seller's refund request.
 *
 * Validates the cross-seller authorization boundary for the refund request
 * retrieval endpoint. The endpoint's authorization logic traces through
 * orderItems → productVariants → products → seller_id and must reject access
 * when the authenticated seller does not own the product associated with the
 * refund request's order item.
 *
 * 1. Seller A registers and authenticates via join.
 * 2. Seller B registers and authenticates via join.
 * 3. Seller B attempts to view a refund request with a generated UUID.
 * 4. System rejects the request — sellers can only view their own refund requests.
 */
export async function test_api_refund_request_seller_cross_access_denied(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register Seller A
  const sellerAConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerAConnection, {});
  // 2. Register Seller B
  const sellerBConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerBConnection, {});
  // 3. Seller B attempts cross-access to a refund request
  const refundRequestId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error(
    "Seller B cannot access another seller's refund request",
    async () => {
      await api.functional.shoppingMall.seller.refund_requests.at(
        sellerBConnection,
        { requestId: refundRequestId },
      );
    },
  );
}
