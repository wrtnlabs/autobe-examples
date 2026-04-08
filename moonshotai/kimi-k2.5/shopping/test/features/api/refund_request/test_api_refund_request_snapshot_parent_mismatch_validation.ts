import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import type { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import type { IEcommerceMallProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantOption";
import type { IEcommerceMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallRefundRequest";
import type { IEcommerceMallRefundRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallRefundRequestSnapshot";
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
import { generate_random_ecommerce_mall_customer_refund_requests_create } from "../../../generate/generate_random_ecommerce_mall_customer_refund_requests_create";
import { prepare_random_ecommerce_mall_refund_request } from "../../../prepare/prepare_random_ecommerce_mall_refund_request";

/**
 * Test that the endpoint correctly validates snapshot ownership by verifying
 * the snapshot belongs to the specified refund request. This scenario validates
 * error handling when a valid snapshotId from one refund request is accessed
 * using a different refundRequestId path parameter.
 */
export async function test_api_refund_request_snapshot_parent_mismatch_validation(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create and authenticate seller
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(sellerAuth);
  // 2. Create and authenticate customer
  const customerConnection: api.IConnection = { host: connection.host };
  const customerAuth = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(customerAuth);
  // 3. Create first refund request
  const firstRefundRequest =
    await generate_random_ecommerce_mall_customer_refund_requests_create(
      customerConnection,
      {
        body: {
          orderItemId: typia.random<string & tags.Format<"uuid">>(),
          reason: RandomGenerator.paragraph({ sentences: 2 }),
        },
      },
    );
  typia.assert(firstRefundRequest);
  // 4. Create second refund request
  const secondRefundRequest =
    await generate_random_ecommerce_mall_customer_refund_requests_create(
      customerConnection,
      {
        body: {
          orderItemId: typia.random<string & tags.Format<"uuid">>(),
          reason: RandomGenerator.paragraph({ sentences: 2 }),
        },
      },
    );
  typia.assert(secondRefundRequest);
  // 5. Respond to first refund request (creates snapshot)
  const updatedFirstRequest =
    await api.functional.ecommerceMall.seller.refund_requests.update(
      sellerConnection,
      {
        refundRequestId: firstRefundRequest.id,
        body: {
          status: "approved",
          responseReason: RandomGenerator.paragraph({ sentences: 1 }),
        } satisfies IEcommerceMallRefundRequest.IUpdate,
      },
    );
  typia.assert(updatedFirstRequest);
  typia.assert(updatedFirstRequest.snapshots.length > 0);
  const firstSnapshotId = updatedFirstRequest.snapshots[0]!.id;
  // 6. Respond to second refund request (creates snapshot)
  const updatedSecondRequest =
    await api.functional.ecommerceMall.seller.refund_requests.update(
      sellerConnection,
      {
        refundRequestId: secondRefundRequest.id,
        body: {
          status: "rejected",
          responseReason: RandomGenerator.paragraph({ sentences: 1 }),
        } satisfies IEcommerceMallRefundRequest.IUpdate,
      },
    );
  typia.assert(updatedSecondRequest);
  typia.assert(updatedSecondRequest.snapshots.length > 0);
  const secondSnapshotId = updatedSecondRequest.snapshots[0]!.id;
  // 7. Verify snapshot ownership - second snapshot should NOT be accessible via first refund request ID
  await TestValidator.httpError(
    "snapshot from different refund request returns 404",
    404,
    async () => {
      await api.functional.ecommerceMall.seller.refund_requests.snapshots.at(
        sellerConnection,
        {
          refundRequestId: firstRefundRequest.id,
          snapshotId: secondSnapshotId,
        },
      );
    },
  );
  // 8. Verify first snapshot IS accessible via first refund request ID (sanity check)
  const firstSnapshot =
    await api.functional.ecommerceMall.seller.refund_requests.snapshots.at(
      sellerConnection,
      {
        refundRequestId: firstRefundRequest.id,
        snapshotId: firstSnapshotId,
      },
    );
  typia.assert(firstSnapshot);
  TestValidator.equals(
    "snapshot belongs to correct refund request",
    firstSnapshot.refundRequestId,
    firstRefundRequest.id,
  );
}
