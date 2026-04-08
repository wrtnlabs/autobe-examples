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
 * Test seller retrieval of approved cancellation request.
 *
 * Validates that a seller can successfully retrieve a cancellation request for their order item that has been approved. The test ensures the response contains all required fields including the customer's cancellation reason, the approved status, the seller's response text, and validates timestamp ordering. Note: This test relies on simulation mode or pre-existing test data since entity creation endpoints are not available in the provided SDK.
 *
 * 1. Seller authenticates via join endpoint.
 * 2. Generate random UUIDs for order, item, and cancellation request IDs.
 * 3. Retrieve the cancellation request using the seller's authenticated connection.
 * 4. Validate the response structure matches IEcommerceCancellationRequest type.
 * 5. Validate status field equals 'approved'.
 * 6. Validate reason field is non-empty string.
 * 7. Validate sellerResponse field is non-null with approval decision text.
 * 8. Validate createdAt is before or equal to updatedAt to confirm request was updated after approval.
 */
export async function test_api_seller_cancellation_request_retrieval_approved(
  connection: api.IConnection,
): Promise<void> {
  // 1. Seller authentication
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth: IEcommerceSeller.IAuthorized = await authorize_seller_join(
    sellerConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IEcommerceSeller.IJoin,
    },
  );
  typia.assert(sellerAuth);
  // 2. Generate random IDs for the cancellation request retrieval
  const orderId = typia.random<string & tags.Format<"uuid">>();
  const itemId = typia.random<string & tags.Format<"uuid">>();
  const requestId = typia.random<string & tags.Format<"uuid">>();
  // 3. Retrieve the cancellation request
  const cancellationRequest =
    await api.functional.ecommerce.seller.orders.items.cancellation_requests.at(
      sellerConnection,
      {
        orderId,
        itemId,
        requestId,
      },
    );
  typia.assert(cancellationRequest);
  // 4. Validate status is 'approved'
  TestValidator.equals(
    "status is approved",
    cancellationRequest.status,
    "approved",
  );
  // 5. Validate reason is non-empty
  TestValidator.predicate(
    "reason is non-empty",
    cancellationRequest.reason.length > 0,
  );
  // 6. Validate sellerResponse is non-null
  TestValidator.predicate(
    "seller response exists",
    cancellationRequest.sellerResponse !== null,
  );
  // 7. Validate sellerResponse is non-empty when exists
  TestValidator.predicate(
    "seller response is non-empty",
    cancellationRequest.sellerResponse !== null &&
      cancellationRequest.sellerResponse.length > 0,
  );
  // 8. Validate timestamp ordering (createdAt before or equal to updatedAt)
  const createdAt = new Date(cancellationRequest.createdAt);
  const updatedAt = new Date(cancellationRequest.updatedAt);
  TestValidator.predicate(
    "updated after created",
    updatedAt.getTime() >= createdAt.getTime(),
  );
}
