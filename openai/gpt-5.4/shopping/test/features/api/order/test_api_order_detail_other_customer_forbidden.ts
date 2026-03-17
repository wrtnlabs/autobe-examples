import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallOrder";
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
import { generate_random_shopping_mall_customer_payment_attempts_create } from "../../../generate/generate_random_shopping_mall_customer_payment_attempts_create";
import { prepare_random_shopping_mall_payment_attempt } from "../../../prepare/prepare_random_shopping_mall_payment_attempt";

export async function test_api_order_detail_other_customer_forbidden(
  connection: api.IConnection,
): Promise<void> {
  const ownerConnection: api.IConnection = { host: connection.host };
  const ownerAuth = await authorize_customer_join(ownerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(ownerAuth);
  const otherCustomerConnection: api.IConnection = { host: connection.host };
  const otherCustomerAuth = await authorize_customer_join(
    otherCustomerConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: typia.random<string & tags.Format<"ipv4">>(),
      },
    },
  );
  typia.assert(otherCustomerAuth);
  const paymentAttempt =
    await generate_random_shopping_mall_customer_payment_attempts_create(
      ownerConnection,
      {
        body: {
          amount: 100,
          gateway_provider: "test_gateway",
        },
      },
    );
  typia.assert(paymentAttempt);
  const finalizedPaymentAttempt =
    await api.functional.shoppingMall.customer.paymentAttempts.update(
      ownerConnection,
      {
        paymentAttemptId: paymentAttempt.id,
        body: {
          status: "succeeded",
          gateway_provider: paymentAttempt.gateway_provider,
          gateway_reference: paymentAttempt.gateway_reference,
          failure_reason: null,
          processed_at: new Date().toISOString(),
        } satisfies IShoppingMallPaymentAttempt.IUpdate,
      },
    );
  typia.assert(finalizedPaymentAttempt);
  const orderPage = await api.functional.shoppingMall.customer.orders.index(
    ownerConnection,
    {
      body: {
        page: 1,
        limit: 100,
      } satisfies IShoppingMallOrder.IRequest,
    },
  );
  typia.assert(orderPage);
  TestValidator.predicate(
    "owner has at least one order",
    orderPage.data.length > 0,
  );
  let baselineOrder: IShoppingMallOrder | null = null;
  for (const summary of orderPage.data) {
    const detail = await api.functional.shoppingMall.customer.orders.at(
      ownerConnection,
      {
        orderId: summary.id,
      },
    );
    typia.assert(detail);
    if (detail.paymentAttempt?.id === finalizedPaymentAttempt.id) {
      baselineOrder = detail;
      break;
    }
  }
  TestValidator.predicate(
    "owner order linked to finalized payment attempt exists",
    baselineOrder !== null,
  );
  const safeBaselineOrder = typia.assert<IShoppingMallOrder>(baselineOrder);
  TestValidator.equals(
    "baseline order belongs to owner",
    safeBaselineOrder.customer.id,
    ownerAuth.id,
  );
  TestValidator.equals(
    "other customer is different actor",
    otherCustomerAuth.id,
    ownerAuth.id,
  );
  await TestValidator.httpError(
    "other customer cannot read owner's order detail",
    [403, 404],
    async () => {
      await api.functional.shoppingMall.customer.orders.at(
        otherCustomerConnection,
        {
          orderId: safeBaselineOrder.id,
        },
      );
    },
  );
  const reloadedOrder = await api.functional.shoppingMall.customer.orders.at(
    ownerConnection,
    {
      orderId: safeBaselineOrder.id,
    },
  );
  typia.assert(reloadedOrder);
  TestValidator.equals(
    "order unchanged after unauthorized read",
    reloadedOrder,
    safeBaselineOrder,
  );
}
