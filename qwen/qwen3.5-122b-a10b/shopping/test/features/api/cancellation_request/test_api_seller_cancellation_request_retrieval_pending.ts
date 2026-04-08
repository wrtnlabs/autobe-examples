import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCancellationRequest";
import type { IEcommerceCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCategory";
import type { IEcommerceCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCustomer";
import type { IEcommerceOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceOrder";
import type { IEcommerceOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceOrderItem";
import type { IEcommerceProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceProduct";
import type { IEcommerceProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceProductVariant";
import type { IEcommerceSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSeller";
import type { IEcommerceSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSellerProfile";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

/**
 * Test seller cancellation request retrieval for pending status.
 *
 * Validates that a seller can successfully retrieve a pending cancellation request for an order item from their product. The test ensures the response includes all required fields with correct values for the pending state scenario.
 *
 * The workflow authenticates a seller, calls the cancellation request retrieval endpoint, and validates the response structure and business logic fields.
 *
 * 1. Seller registers and authenticates via join endpoint.
 * 2. Seller-specific connection created with authorization token.
 * 3. Cancellation request retrieval endpoint called with order ID, item ID, and request ID.
 * 4. Response validated for type safety using typia.assert().
 * 5. Status field validated as 'pending' for awaiting seller decision.
 * 6. Seller response field validated as null (no decision made yet).
 * 7. Customer cancellation reason validated as present string.
 * 8. Embedded order item summary validated for product variant and seller details.
 */
export async function test_api_seller_cancellation_request_retrieval_pending(
  connection: api.IConnection,
): Promise<void> {
  // 1. Seller registration and authentication
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceSeller.IJoin,
  });
  typia.assert(sellerAuth);
  // 2. Retrieve pending cancellation request
  const cancellationRequest: IEcommerceCancellationRequest =
    await api.functional.ecommerce.seller.orders.items.cancellation_requests.at(
      sellerConnection,
      {
        orderId: typia.random<string & tags.Format<"uuid">>(),
        itemId: typia.random<string & tags.Format<"uuid">>(),
        requestId: typia.random<string & tags.Format<"uuid">>(),
      },
    );
  typia.assert(cancellationRequest);
  // 3. Validate pending status
  TestValidator.equals(
    "status is pending",
    cancellationRequest.status,
    "pending",
  );
  // 4. Validate seller response is null (no decision made)
  TestValidator.equals(
    "seller response is null",
    cancellationRequest.sellerResponse,
    null,
  );
  // 5. Validate cancellation reason exists
  TestValidator.predicate(
    "reason exists",
    cancellationRequest.reason.length > 0,
  );
  // 6. Validate order item summary structure
  TestValidator.predicate(
    "order item has ID",
    cancellationRequest.orderItem.id.length > 0,
  );
  TestValidator.predicate(
    "order item has quantity",
    cancellationRequest.orderItem.quantity > 0,
  );
  TestValidator.predicate(
    "order item has unit price",
    cancellationRequest.orderItem.unit_price > 0,
  );
  // 7. Validate product variant details in summary
  TestValidator.predicate(
    "variant has SKU code",
    cancellationRequest.orderItem.productVariant.sku_code.length > 0,
  );
  TestValidator.predicate(
    "variant has option values",
    cancellationRequest.orderItem.productVariant.option_values.length > 0,
  );
  // 8. Validate seller information in summary
  TestValidator.predicate(
    "seller has shop name",
    cancellationRequest.orderItem.seller.shop_name.length > 0,
  );
}
