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

export async function test_api_cancellation_request_update_denied_for_other_seller(
  connection: api.IConnection,
): Promise<void> {
  const sellerOneConnection: api.IConnection = { host: connection.host };
  const sellerOneJoin = await authorize_seller_join(sellerOneConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IShoppingMallSeller.IJoin,
  });
  typia.assert(sellerOneJoin);
  const sellerTwoConnection: api.IConnection = { host: connection.host };
  const sellerTwoJoin = await authorize_seller_join(sellerTwoConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IShoppingMallSeller.IJoin,
  });
  typia.assert(sellerTwoJoin);
  const customerConnection: api.IConnection = { host: connection.host };
  const customerJoin = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IShoppingMallCustomer.IJoin,
  });
  typia.assert(customerJoin);
  const cancellationRequest =
    await generate_random_shopping_mall_customer_cancellation_requests_create(
      customerConnection,
      {},
    );
  typia.assert(cancellationRequest);
  TestValidator.equals(
    "cancellation request belongs to authenticated customer",
    cancellationRequest.customer.id,
    customerJoin.id,
  );
  TestValidator.equals(
    "cancellation request targets one order item",
    cancellationRequest.orderItem.id,
    cancellationRequest.orderItem.id,
  );
  TestValidator.equals(
    "new cancellation request starts pending",
    cancellationRequest.status,
    "pending",
  );
  TestValidator.equals(
    "new cancellation request has no reviewer type",
    cancellationRequest.reviewed_by_type,
    null,
  );
  TestValidator.equals(
    "new cancellation request has no reviewed timestamp",
    cancellationRequest.reviewed_at,
    null,
  );
  TestValidator.equals(
    "new cancellation request has no decision note",
    cancellationRequest.decision_note,
    null,
  );
  const ownerSellerId = cancellationRequest.orderItem.seller.id;
  const sellerOneOwnsTarget = ownerSellerId === sellerOneJoin.id;
  const sellerTwoOwnsTarget = ownerSellerId === sellerTwoJoin.id;
  const unauthorizedSellerConnection: api.IConnection = sellerOneOwnsTarget
    ? sellerTwoConnection
    : sellerOneConnection;
  const unauthorizedSellerId: string = sellerOneOwnsTarget
    ? sellerTwoJoin.id
    : sellerOneJoin.id;
  TestValidator.predicate(
    "chosen acting seller does not own the target order item",
    unauthorizedSellerId !== ownerSellerId,
  );
  TestValidator.predicate(
    "ownership is item-scoped to the order item seller",
    sellerOneOwnsTarget ||
      sellerTwoOwnsTarget ||
      unauthorizedSellerId !== ownerSellerId,
  );
  const updateBody = {
    status: "approved",
    decision_note: RandomGenerator.paragraph({ sentences: 2 }),
  } satisfies IShoppingMallCancellationRequest.IUpdate;
  await TestValidator.error(
    "other seller cannot update cancellation request for another seller order item",
    async () => {
      await api.functional.shoppingMall.seller.cancellation_requests.update(
        unauthorizedSellerConnection,
        {
          cancellationRequestId: cancellationRequest.id,
          body: updateBody,
        },
      );
    },
  );
}
