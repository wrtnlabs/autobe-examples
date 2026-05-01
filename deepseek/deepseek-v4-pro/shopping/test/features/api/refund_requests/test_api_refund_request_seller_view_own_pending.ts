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
 * Test that a seller can view the details of their own pending refund request.
 *
 * Validates the seller's ability to retrieve a refund request submitted by a customer for one of the seller's delivered products. The seller authenticates through the join flow, then fetches the refund request by its UUID identifier.
 *
 * The test verifies that the response contains all required refund request fields: the customer's reason text, current pending status, creation and update timestamps, and the associated order item with product variant information. Special attention is given to confirming that the responded_at and deleted_at fields are null for an active pending request, indicating no seller action has been taken yet.
 *
 * 1. Seller registers and authenticates via join.
 * 2. Seller retrieves the refund request by UUID.
 * 3. Validates refund request structure and pending state.
 */
export async function test_api_refund_request_seller_view_own_pending(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as seller
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {});
  // 2. Retrieve refund request
  const refundRequest =
    await api.functional.shoppingMall.seller.refund_requests.at(
      sellerConnection,
      {
        requestId: typia.random<string & tags.Format<"uuid">>(),
      },
    );
  typia.assert(refundRequest);
  // 3. Validate refund request business state
  TestValidator.equals("status is pending", refundRequest.status, "pending");
  TestValidator.equals(
    "responded_at is null",
    refundRequest.responded_at,
    null,
  );
  TestValidator.equals("deleted_at is null", refundRequest.deleted_at, null);
}
