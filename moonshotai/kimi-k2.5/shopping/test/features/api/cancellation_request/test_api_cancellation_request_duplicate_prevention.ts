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

export async function test_api_cancellation_request_duplicate_prevention(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Set up authenticated seller
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const sellerPassword = RandomGenerator.alphaNumeric(16);
  const seller = await authorize_seller_join(sellerConnection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceMallSeller.IJoin,
  });
  typia.assert(seller);
  // Step 2: Set up authenticated customer
  const customerConnection: api.IConnection = { host: connection.host };
  const customerEmail = typia.random<string & tags.Format<"email">>();
  const customerPassword = RandomGenerator.alphaNumeric(16);
  const customer = await authorize_customer_join(customerConnection, {
    body: {
      email: customerEmail,
      password: customerPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceMallCustomer.IJoin,
  });
  typia.assert(customer);
  // Step 3: Seller creates a product
  const product = await generate_random_ecommerce_mall_seller_products_create(
    sellerConnection,
    {
      body: {
        name: RandomGenerator.name(),
        description: RandomGenerator.paragraph({ sentences: 3 }),
        categoryId: typia.random<string & tags.Format<"uuid">>(),
        basePrice: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<1000>
        >(),
      } satisfies IEcommerceMallProduct.ICreate,
    },
  );
  typia.assert(product);
  // Step 4: Create initial cancellation request
  // The generate_random function handles order item creation internally
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
  // Verify initial state - should be pending
  TestValidator.equals(
    "initial status is pending",
    cancellationRequest.status,
    "pending",
  );
  TestValidator.equals(
    "initial responseReason is null",
    cancellationRequest.responseReason,
    null,
  );
  TestValidator.equals(
    "initial respondedAt is null",
    cancellationRequest.respondedAt,
    null,
  );
  const orderItemId = cancellationRequest.orderItem.id;
  // Step 5: Seller approves the cancellation request
  const responseReason = RandomGenerator.paragraph({ sentences: 1 });
  const approvedRequest =
    await api.functional.ecommerceMall.seller.cancellation_requests.update(
      sellerConnection,
      {
        cancellationRequestId: cancellationRequest.id,
        body: {
          status: "approved",
          responseReason: responseReason,
        } satisfies IEcommerceMallCancellationRequest.IUpdate,
      },
    );
  typia.assert(approvedRequest);
  // Step 6: Validate approved state and snapshot immutability
  TestValidator.equals(
    "status changed to approved",
    approvedRequest.status,
    "approved",
  );
  TestValidator.predicate(
    "responseReason is set after approval",
    approvedRequest.responseReason !== null,
  );
  TestValidator.predicate(
    "respondedAt is populated after approval",
    approvedRequest.respondedAt !== null,
  );
  TestValidator.equals(
    "responseReason matches input",
    approvedRequest.responseReason,
    responseReason,
  );
  // Validate snapshot was created for state tracking
  TestValidator.predicate(
    "snapshots array exists",
    Array.isArray(approvedRequest.snapshots),
  );
  TestValidator.predicate(
    "at least one snapshot exists",
    approvedRequest.snapshots.length > 0,
  );
  const snapshot = approvedRequest.snapshots[0];
  typia.assert(snapshot);
  TestValidator.equals(
    "snapshot status_before is pending",
    snapshot.statusBefore,
    "pending",
  );
  TestValidator.equals(
    "snapshot status_after is approved",
    snapshot.statusAfter,
    "approved",
  );
  TestValidator.equals(
    "snapshot cancellationRequestId matches",
    snapshot.cancellationRequestId,
    cancellationRequest.id,
  );
  TestValidator.predicate(
    "snapshot createdAt is populated",
    snapshot.createdAt !== null,
  );
  TestValidator.predicate(
    "reviewer note is captured in snapshot",
    snapshot.reviewerNote !== null,
  );
  // Step 7: Validate order item status was updated to cancelled
  TestValidator.equals(
    "order item status is cancelled after approval",
    approvedRequest.orderItem.status,
    "cancelled",
  );
  // Step 8: Attempt to create duplicate cancellation request - should fail
  // Business rule 386: Prevent duplicate cancellation requests for processed items
  await TestValidator.error(
    "duplicate cancellation request should be rejected for already-cancelled item",
    async () => {
      await api.functional.ecommerceMall.customer.cancellation_requests.create(
        customerConnection,
        {
          body: {
            orderItemId: orderItemId,
            reason: RandomGenerator.paragraph({ sentences: 2 }),
          } satisfies IEcommerceMallCancellationRequest.ICreate,
        },
      );
    },
  );
  // Additional validation: Verify the approved request cannot be updated again
  await TestValidator.error(
    "already processed cancellation request cannot be updated again",
    async () => {
      await api.functional.ecommerceMall.seller.cancellation_requests.update(
        sellerConnection,
        {
          cancellationRequestId: cancellationRequest.id,
          body: {
            status: "rejected",
            responseReason: RandomGenerator.paragraph({ sentences: 1 }),
          } satisfies IEcommerceMallCancellationRequest.IUpdate,
        },
      );
    },
  );
}
