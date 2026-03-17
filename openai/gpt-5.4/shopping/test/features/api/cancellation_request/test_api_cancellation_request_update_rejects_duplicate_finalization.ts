import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCancellationRequest";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderAddressSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderAddressSnapshot";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import type { IShoppingMallPaymentAttempt } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPaymentAttempt";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductPurchaseSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductPurchaseSnapshot";
import type { IShoppingMallProductPurchaseSnapshotOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductPurchaseSnapshotOptionValue";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRefundRequest";
import type { IShoppingMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReview";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerProfilePurchaseSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfilePurchaseSnapshot";
import type { IShoppingMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipment";
import type { IShoppingMallTrackingInfo } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallTrackingInfo";
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
import { generate_random_shopping_mall_customer_cancellation_requests_create } from "../../../generate/generate_random_shopping_mall_customer_cancellation_requests_create";
import { prepare_random_shopping_mall_cancellation_request } from "../../../prepare/prepare_random_shopping_mall_cancellation_request";

export async function test_api_cancellation_request_update_rejects_duplicate_finalization(
  connection: api.IConnection,
): Promise<void> {
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(seller);
  const customerConnection: api.IConnection = { host: connection.host };
  const customer = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(customer);
  const created =
    await generate_random_shopping_mall_customer_cancellation_requests_create(
      customerConnection,
      {},
    );
  typia.assert(created);
  TestValidator.equals(
    "created request starts unreviewed at",
    created.reviewed_at,
    null,
  );
  TestValidator.equals(
    "created request starts unreviewed by type",
    created.reviewed_by_type,
    null,
  );
  const cancellationRequestId = created.id;
  const originalOrderItemId = created.orderItem.id;
  const originalOrderItemStatus = created.orderItem.status;
  const originalReason = created.reason;
  const firstDecisionNote = RandomGenerator.paragraph({ sentences: 2 });
  const firstUpdateBody = {
    status: "approved",
    decision_note: firstDecisionNote,
  } satisfies IShoppingMallCancellationRequest.IUpdate;
  const finalized =
    await api.functional.shoppingMall.seller.cancellation_requests.update(
      sellerConnection,
      {
        cancellationRequestId,
        body: firstUpdateBody,
      },
    );
  typia.assert(finalized);
  TestValidator.equals(
    "same cancellation request id after first finalization",
    finalized.id,
    cancellationRequestId,
  );
  TestValidator.equals(
    "same order item after first finalization",
    finalized.orderItem.id,
    originalOrderItemId,
  );
  TestValidator.equals(
    "original reason preserved after first finalization",
    finalized.reason,
    originalReason,
  );
  TestValidator.equals(
    "first finalization status applied",
    finalized.status,
    "approved",
  );
  TestValidator.equals(
    "first decision note recorded",
    finalized.decision_note,
    firstDecisionNote,
  );
  TestValidator.notEquals(
    "review timestamp assigned on first finalization",
    finalized.reviewed_at,
    null,
  );
  TestValidator.notEquals(
    "review actor type assigned on first finalization",
    finalized.reviewed_by_type,
    null,
  );
  const finalizedReviewedAt = finalized.reviewed_at;
  const finalizedReviewedByType = finalized.reviewed_by_type;
  const finalizedOrderItemStatus = finalized.orderItem.status;
  await TestValidator.error("duplicate finalization is rejected", async () => {
    await api.functional.shoppingMall.seller.cancellation_requests.update(
      sellerConnection,
      {
        cancellationRequestId,
        body: {
          status: "rejected",
          decision_note: RandomGenerator.paragraph({ sentences: 3 }),
        } satisfies IShoppingMallCancellationRequest.IUpdate,
      },
    );
  });
  TestValidator.equals(
    "review timestamp from first decision remains the accepted value in returned finalized payload",
    finalized.reviewed_at,
    finalizedReviewedAt,
  );
  TestValidator.equals(
    "review actor type from first decision remains the accepted value in returned finalized payload",
    finalized.reviewed_by_type,
    finalizedReviewedByType,
  );
  TestValidator.equals(
    "item identity remains unchanged in finalized payload",
    finalized.orderItem.id,
    originalOrderItemId,
  );
  TestValidator.equals(
    "item lifecycle snapshot from first valid decision remains stable in finalized payload",
    finalized.orderItem.status,
    finalizedOrderItemStatus,
  );
  TestValidator.equals(
    "original baseline item status was captured",
    originalOrderItemStatus,
    created.orderItem.status,
  );
}
