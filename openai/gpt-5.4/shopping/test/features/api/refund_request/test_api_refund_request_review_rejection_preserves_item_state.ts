import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import type { IShoppingMallPaymentAttempt } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPaymentAttempt";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRefundRequest";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipment";
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
import { generate_random_shopping_mall_customer_payment_attempts_create } from "../../../generate/generate_random_shopping_mall_customer_payment_attempts_create";
import { generate_random_shopping_mall_customer_refund_requests_create } from "../../../generate/generate_random_shopping_mall_customer_refund_requests_create";
import { prepare_random_shopping_mall_payment_attempt } from "../../../prepare/prepare_random_shopping_mall_payment_attempt";
import { prepare_random_shopping_mall_refund_request } from "../../../prepare/prepare_random_shopping_mall_refund_request";

export async function test_api_refund_request_review_rejection_preserves_item_state(
  connection: api.IConnection,
): Promise<void> {
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const sellerPassword = typia.random<string & tags.Format<"password">>();
  const sellerHref = typia.random<string & tags.Format<"uri">>();
  const sellerReferrer = typia.random<string & tags.Format<"uri">>();
  const sellerIp = typia.random<string & tags.Format<"ipv4">>();
  const sellerJoinConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerJoinConnection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
      href: sellerHref,
      referrer: sellerReferrer,
      ip: sellerIp,
    },
  });
  const customerConnection: api.IConnection = { host: connection.host };
  const customerAuth = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(customerAuth);
  const sellerReviewConnection: api.IConnection = { host: connection.host };
  const sellerLoginBody = {
    email: sellerEmail,
    password: sellerPassword,
    href: sellerHref,
    referrer: sellerReferrer,
    ip: sellerIp,
  } satisfies IShoppingMallSeller.ILogin;
  const sellerLogin = await authorize_seller_login(sellerReviewConnection, {
    body: sellerLoginBody,
  });
  typia.assert(sellerLogin);
  const paymentAttempt =
    await generate_random_shopping_mall_customer_payment_attempts_create(
      customerConnection,
      {
        body: {
          amount: 100,
          gateway_provider: RandomGenerator.paragraph({ sentences: 2 }),
        },
      },
    );
  typia.assert(paymentAttempt);
  TestValidator.equals(
    "payment attempt belongs to customer",
    paymentAttempt.customer.id,
    customerAuth.id,
  );
  TestValidator.predicate(
    "payment amount is positive",
    paymentAttempt.amount > 0,
  );
  const refundRequest =
    await generate_random_shopping_mall_customer_refund_requests_create(
      customerConnection,
      {},
    );
  typia.assert(refundRequest);
  TestValidator.equals(
    "refund request starts without reviewer role",
    refundRequest.reviewer_role,
    null,
  );
  TestValidator.equals(
    "refund request starts without review note",
    refundRequest.review_note,
    null,
  );
  TestValidator.equals(
    "refund request starts without reviewed at",
    refundRequest.reviewed_at,
    null,
  );
  const beforeOrderItem = refundRequest.orderItem;
  const rejectionNote = RandomGenerator.paragraph({ sentences: 3 });
  const updateBody = {
    status: "rejected",
    review_note: rejectionNote,
  } satisfies IShoppingMallRefundRequest.IUpdate;
  const rejected =
    await api.functional.shoppingMall.seller.refund_requests.update(
      sellerReviewConnection,
      {
        refundRequestId: refundRequest.id,
        body: updateBody,
      },
    );
  typia.assert(rejected);
  TestValidator.equals(
    "refund request id preserved",
    rejected.id,
    refundRequest.id,
  );
  TestValidator.equals(
    "refund request customer preserved",
    rejected.customer.id,
    refundRequest.customer.id,
  );
  TestValidator.equals(
    "refund reason preserved",
    rejected.reason,
    refundRequest.reason,
  );
  TestValidator.equals("refund status rejected", rejected.status, "rejected");
  TestValidator.equals(
    "reviewer role is seller",
    rejected.reviewer_role,
    "seller",
  );
  TestValidator.equals(
    "review note stored",
    rejected.review_note,
    rejectionNote,
  );
  TestValidator.predicate(
    "reviewed at populated",
    rejected.reviewed_at !== null,
  );
  TestValidator.equals(
    "single disputed order item preserved",
    rejected.orderItem.id,
    beforeOrderItem.id,
  );
  TestValidator.equals(
    "order item quantity preserved after rejection",
    rejected.orderItem.quantity,
    beforeOrderItem.quantity,
  );
  TestValidator.equals(
    "order item unit price preserved after rejection",
    rejected.orderItem.unit_price,
    beforeOrderItem.unit_price,
  );
  TestValidator.equals(
    "order item status preserved after rejection",
    rejected.orderItem.status,
    beforeOrderItem.status,
  );
  TestValidator.equals(
    "order item seller preserved",
    rejected.orderItem.seller.id,
    beforeOrderItem.seller.id,
  );
  TestValidator.equals(
    "product variant preserved",
    rejected.orderItem.productVariant.id,
    beforeOrderItem.productVariant.id,
  );
  TestValidator.equals(
    "shipment linkage preserved",
    rejected.orderItem.shipment?.id ?? null,
    beforeOrderItem.shipment?.id ?? null,
  );
}
