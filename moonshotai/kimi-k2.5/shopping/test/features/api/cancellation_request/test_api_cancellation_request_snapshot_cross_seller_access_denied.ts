import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCancellationRequest";
import type { IEcommerceMallCancellationRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCancellationRequestSnapshot";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import type { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
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
import { prepare_random_ecommerce_mall_cancellation_request } from "../../../prepare/prepare_random_ecommerce_mall_cancellation_request";

/**
 * Test cross-seller authorization boundaries for cancellation request snapshots.
 *
 * Validates that sellers cannot access cancellation request snapshots belonging to other sellers.
 * The test verifies:
 * 1. Customer A creates a cancellation request for Seller A's product
 * 2. Seller A responds to the request, creating a snapshot
 * 3. Seller B attempts to retrieve Seller A's snapshot
 * 4. System denies access with an error (403 or 404)
 *
 * This enforces the business rule that cancellation request data is private to the seller
 * who owns the order item, protecting sensitive order and customer information.
 */
export async function test_api_cancellation_request_snapshot_cross_seller_access_denied(
  connection: api.IConnection,
): Promise<void> {
  // Setup isolated connections for each actor (Connection Isolation Pattern)
  const customerConnection: api.IConnection = { host: connection.host };
  const sellerAConnection: api.IConnection = { host: connection.host };
  const sellerBConnection: api.IConnection = { host: connection.host };
  // Step 1: Create Customer A
  const customerAuth = await authorize_customer_join(customerConnection, {
    body: {
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(customerAuth);
  // Step 2: Create Seller A (owner of the order item)
  const sellerAAuth = await authorize_seller_join(sellerAConnection, {
    body: {
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(sellerAAuth);
  // Step 3: Create Seller B (unauthorized access attempt)
  const sellerBAuth = await authorize_seller_join(sellerBConnection, {
    body: {
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(sellerBAuth);
  // Verify sellers are distinct entities
  TestValidator.notEquals(
    "Seller A and Seller B have different IDs",
    sellerAAuth.id,
    sellerBAuth.id,
  );
  // Step 4: Customer A creates cancellation request
  const cancellationRequest =
    await generate_random_ecommerce_mall_customer_cancellation_requests_create(
      customerConnection,
      {},
    );
  typia.assert(cancellationRequest);
  // Step 5: Seller A responds to create a snapshot
  const updatedRequest =
    await api.functional.ecommerceMall.seller.cancellation_requests.update(
      sellerAConnection,
      {
        cancellationRequestId: cancellationRequest.id,
        body: {
          status: "approved",
          responseReason: "Cancellation approved by seller",
        } satisfies IEcommerceMallCancellationRequest.IUpdate,
      },
    );
  typia.assert(updatedRequest);
  // Verify snapshot was created
  TestValidator.predicate(
    "Snapshot exists after seller response",
    updatedRequest.snapshots.length > 0,
  );
  const snapshotId = updatedRequest.snapshots[0].id;
  // Step 6: Seller B attempts to access the snapshot - should be denied
  await TestValidator.error(
    "Seller B accessing Seller A's snapshot should fail",
    async () => {
      await api.functional.ecommerceMall.seller.cancellation_requests.snapshots.at(
        sellerBConnection,
        {
          cancellationRequestId: cancellationRequest.id,
          snapshotId: snapshotId,
        },
      );
    },
  );
}
