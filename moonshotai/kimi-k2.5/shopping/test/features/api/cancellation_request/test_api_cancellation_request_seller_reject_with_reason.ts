import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCancellationRequest";
import type { IEcommerceMallCancellationRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCancellationRequestSnapshot";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import type { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductImage";
import type { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import type { IEcommerceMallProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantOption";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallSellerProfileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfileSnapshot";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_ecommerce_mall_customer_cancellation_requests_create } from "../../../generate/generate_random_ecommerce_mall_customer_cancellation_requests_create";
import { generate_random_ecommerce_mall_seller_products_create } from "../../../generate/generate_random_ecommerce_mall_seller_products_create";
import { prepare_random_ecommerce_mall_cancellation_request } from "../../../prepare/prepare_random_ecommerce_mall_cancellation_request";
import { prepare_random_ecommerce_mall_product } from "../../../prepare/prepare_random_ecommerce_mall_product";

export async function test_api_cancellation_request_seller_reject_with_reason(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create and authenticate seller
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
    },
  });
  typia.assert(seller);
  // 2. Seller creates a product
  const product = await generate_random_ecommerce_mall_seller_products_create(
    sellerConnection,
    {
      body: {
        name: RandomGenerator.name(3),
        description: RandomGenerator.paragraph({ sentences: 3 }),
        categoryId: typia.random<string & tags.Format<"uuid">>(),
        basePrice: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<1000>
        >(),
      } satisfies IEcommerceMallProduct.ICreate,
    },
  );
  typia.assert(product);
  // 3. Create and authenticate customer
  const customerConnection: api.IConnection = { host: connection.host };
  const customer = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
    },
  });
  typia.assert(customer);
  // 4. Customer creates a cancellation request (this creates pending request)
  const cancellationRequest =
    await generate_random_ecommerce_mall_customer_cancellation_requests_create(
      customerConnection,
      {
        body: {
          orderItemId: typia.random<string & tags.Format<"uuid">>(),
          reason: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies IEcommerceMallCancellationRequest.ICreate,
      },
    );
  typia.assert(cancellationRequest);
  // Verify initial state is pending
  TestValidator.equals(
    "initial cancellation request status",
    cancellationRequest.status,
    "pending",
  );
  TestValidator.equals(
    "initial response reason is null",
    cancellationRequest.responseReason,
    null,
  );
  TestValidator.equals(
    "initial responded at is null",
    cancellationRequest.respondedAt,
    null,
  );
  // 5. Seller rejects the cancellation request with a reason
  const rejectionReason =
    "Cannot cancel because the item has already been prepared for shipment.";
  const rejectedRequest =
    await api.functional.ecommerceMall.seller.cancellation_requests.update(
      sellerConnection,
      {
        cancellationRequestId: cancellationRequest.id,
        body: {
          status: "rejected",
          responseReason: rejectionReason,
        } satisfies IEcommerceMallCancellationRequest.IUpdate,
      },
    );
  typia.assert(rejectedRequest);
  // 6. Validate rejection response
  TestValidator.equals(
    "status changed to rejected",
    rejectedRequest.status,
    "rejected",
  );
  TestValidator.equals(
    "response reason matches input",
    rejectedRequest.responseReason,
    rejectionReason,
  );
  TestValidator.predicate(
    "responded at is populated",
    rejectedRequest.respondedAt !== null,
  );
  // 7. Validate snapshot was created per business rule 387
  TestValidator.predicate(
    "snapshot exists in snapshots array",
    rejectedRequest.snapshots.length > 0,
  );
  const snapshot = rejectedRequest.snapshots.find(
    (s) => s.statusBefore === "pending" && s.statusAfter === "rejected",
  );
  typia.assertGuard(snapshot!);
  TestValidator.equals(
    "snapshot status_before is pending",
    snapshot!.statusBefore,
    "pending",
  );
  TestValidator.equals(
    "snapshot status_after is rejected",
    snapshot!.statusAfter,
    "rejected",
  );
  TestValidator.equals(
    "snapshot reviewer note matches response reason",
    snapshot!.reviewerNote,
    rejectionReason,
  );
  TestValidator.predicate(
    "snapshot has valid id",
    typeof snapshot!.id === "string" && snapshot!.id.length > 0,
  );
  TestValidator.equals(
    "snapshot cancellation request id matches",
    snapshot!.cancellationRequestId,
    cancellationRequest.id,
  );
}
