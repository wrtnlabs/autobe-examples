import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCategory";
import type { IEcommerceCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCustomer";
import type { IEcommerceOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceOrderItem";
import type { IEcommerceProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceProduct";
import type { IEcommerceProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceProductVariant";
import type { IEcommerceRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceRefundRequest";
import type { IEcommerceSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSeller";
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
import { generate_random_ecommerce_customer_orders_refund_requests_create } from "../../../generate/generate_random_ecommerce_customer_orders_refund_requests_create";
import { prepare_random_ecommerce_refund_request } from "../../../prepare/prepare_random_ecommerce_refund_request";

export async function test_api_refund_rejected_request(
  connection: api.IConnection,
): Promise<void> {
  // 1. Customer signup using utility function
  const customerConnection = { host: connection.host };
  const customer = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "Password123!",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  // 2. Customer login using utility function
  await authorize_customer_login(customerConnection, {
    body: {
      email: customer.email,
      password: "Password123!",
    },
  });
  // 3. Seller signup using utility function
  const sellerConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "Seller123!",
      name: RandomGenerator.name(),
      description: RandomGenerator.paragraph({ sentences: 3 }),
    },
  });
  // 4. Seller login using utility function
  await authorize_seller_login(sellerConnection, {
    body: {
      email: seller.email,
      password: "Seller123!",
    },
  });
  // 5. Create a refund request (status defaults to 'pending')
  const orderId = typia.random<string & tags.Format<"uuid">>();
  const refundRequest =
    await api.functional.ecommerce.customer.orders.refund_requests.create(
      customerConnection,
      {
        id: orderId,
        body: {
          reason: "Product damaged",
        } satisfies IEcommerceRefundRequest.ICreate,
      },
    );
  typia.assert(refundRequest);
  TestValidator.equals(
    "Refund status should be pending",
    refundRequest.status,
    "pending",
  );
  // 6. Seller rejects the refund request
  await api.functional.ecommerce.seller.orders.refund_requests.update(
    sellerConnection,
    {
      orderId,
      refundRequestId: refundRequest.id,
      body: { status: "rejected" } satisfies IEcommerceRefundRequest.IUpdate,
    },
  );
  // 7. Customer validates the updated status
  const retrievedRefund =
    await api.functional.ecommerce.customer.orders.refund_requests.at(
      customerConnection,
      {
        orderId,
        refundRequestId: refundRequest.id,
      },
    );
  typia.assert(retrievedRefund);
  TestValidator.equals(
    "Refund status should be rejected",
    retrievedRefund.status,
    "rejected",
  );
}
