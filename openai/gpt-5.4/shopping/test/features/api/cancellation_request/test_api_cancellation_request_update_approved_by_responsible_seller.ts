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

export async function test_api_cancellation_request_update_approved_by_responsible_seller(
  connection: api.IConnection,
): Promise<void> {
  const customerEmail = typia.random<string & tags.Format<"email">>();
  const customerPassword = typia.random<string & tags.Format<"password">>();
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const sellerPassword = typia.random<string & tags.Format<"password">>();
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {
    body: {
      email: customerEmail,
      password: customerPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IShoppingMallCustomer.IJoin,
  });
  const customerLoginConnection: api.IConnection = { host: connection.host };
  await authorize_customer_login(customerLoginConnection, {
    body: {
      email: customerEmail,
      password: customerPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IShoppingMallCustomer.ILogin,
  });
  const created =
    await generate_random_shopping_mall_customer_cancellation_requests_create(
      customerLoginConnection,
      {},
    );
  typia.assert(created);
  TestValidator.predicate(
    "created request has linked order item",
    created.orderItem.id.length > 0,
  );
  TestValidator.predicate(
    "created request starts unreviewed",
    created.reviewed_at === null,
  );
  TestValidator.predicate(
    "created request has no reviewer yet",
    created.reviewed_by_type === null,
  );
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IShoppingMallSeller.IJoin,
  });
  const sellerLoginConnection: api.IConnection = { host: connection.host };
  await authorize_seller_login(sellerLoginConnection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IShoppingMallSeller.ILogin,
  });
  const decisionNote = RandomGenerator.paragraph({ sentences: 3 });
  const updated =
    await api.functional.shoppingMall.seller.cancellation_requests.update(
      sellerLoginConnection,
      {
        cancellationRequestId: created.id,
        body: {
          status: "approved",
          decision_note: decisionNote,
        } satisfies IShoppingMallCancellationRequest.IUpdate,
      },
    );
  typia.assert(updated);
  TestValidator.equals("same cancellation request id", updated.id, created.id);
  TestValidator.equals("reason preserved", updated.reason, created.reason);
  TestValidator.equals(
    "customer preserved after approval",
    updated.customer.id,
    created.customer.id,
  );
  TestValidator.equals(
    "order item preserved after approval",
    updated.orderItem.id,
    created.orderItem.id,
  );
  TestValidator.equals(
    "decision note updated",
    updated.decision_note,
    decisionNote,
  );
  TestValidator.equals("status approved", updated.status, "approved");
  TestValidator.notEquals(
    "updated_at changed after approval",
    updated.updated_at,
    created.updated_at,
  );
  TestValidator.predicate("reviewed_at assigned", updated.reviewed_at !== null);
  TestValidator.predicate(
    "reviewed_by_type assigned",
    updated.reviewed_by_type !== null,
  );
  TestValidator.predicate(
    "review recorded by seller context",
    updated.reviewed_by_type === "seller",
  );
  TestValidator.predicate(
    "live order item references same cancellation request",
    updated.orderItem.cancellationRequest !== null &&
      updated.orderItem.cancellationRequest.id === updated.id,
  );
  TestValidator.predicate(
    "item scope preserved within parent order",
    ArrayUtil.has(
      updated.orderItem.order.items,
      (item) => item.id === updated.orderItem.id,
    ),
  );
}
