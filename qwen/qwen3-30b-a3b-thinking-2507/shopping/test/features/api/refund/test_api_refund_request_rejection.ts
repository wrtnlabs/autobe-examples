import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceAddress";
import type { IEcommerceAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceAdmin";
import type { IEcommerceCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCancellationRequest";
import type { IEcommerceCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCart";
import type { IEcommerceCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCartItem";
import type { IEcommerceCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCustomer";
import type { IEcommerceCustomerEmailVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCustomerEmailVerification";
import type { IEcommerceCustomerPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCustomerPasswordReset";
import type { IEcommerceCustomerSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCustomerSession";
import type { IEcommerceDefaultAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceDefaultAddress";
import type { IEcommerceOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceOrder";
import type { IEcommerceOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceOrderItem";
import type { IEcommerceProductReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceProductReview";
import type { IEcommerceProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceProductVariant";
import type { IEcommerceRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceRefundRequest";
import type { IEcommerceShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceShipment";
import type { IEcommerceWishlistItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceWishlistItem";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { generate_random_ecommerce_customer_carts_create } from "../../../generate/generate_random_ecommerce_customer_carts_create";
import { generate_random_ecommerce_customer_orders_refund_requests_create } from "../../../generate/generate_random_ecommerce_customer_orders_refund_requests_create";
import { prepare_random_ecommerce_cart } from "../../../prepare/prepare_random_ecommerce_cart";
import { prepare_random_ecommerce_refund_request } from "../../../prepare/prepare_random_ecommerce_refund_request";

export async function test_api_refund_request_rejection(
  connection: api.IConnection,
): Promise<void> {} // 1. Admin authentication  const adminConnection: api.IConnection = { host: connection.host };  await authorize_admin_login(adminConnection, {    body: { email: typia.random<string & tags.Format<"email">>(), password: "1234" },  });  // 2. Customer authentication  const customerConnection: api.IConnection = { host: connection.host };  await authorize_customer_join(customerConnection, {    body: {      email: typia.random<string & tags.Format<"email">>(),      password: "1234",      display_name: RandomGenerator.name(),      href: typia.random<string & tags.Format<"uri">>(),      referrer: typia.random<string & tags.Format<"uri">>(),      ip: typia.random<string & tags.Format<"ipv4">>(),    },  });  // 3. Create cart for customer  const cart = await api.functional.ecommerce.customer.carts.create(customerConnection, {    body: typia.random<IEcommerceCart.ICreate>(),  });  typia.assert(cart);  // 4. Create refund request for the order (using created cart)  const refundRequest = await api.functional.ecommerce.customer.orders.refund_requests.create(    customerConnection,    {      orderId: cart.id,      body: {        reason: RandomGenerator.paragraph({          sentences: 1,          wordMin: 10,          wordMax: 50,        }) satisfies IEcommerceRefundRequest.ICreate['reason'],      },    },  );  typia.assert(refundRequest);  // 5. Update the refund request to 'rejected' with valid reason  const updatedRefundRequest = await api.functional.ecommerce.admin.orders.refund_requests.update(    adminConnection,    {      orderId: cart.id,      id: refundRequest.id,      body: {        status: "rejected",        reason: RandomGenerator.paragraph({          sentences: 1,          wordMin: 10,          wordMax: 50,        }) satisfies IEcommerceRefundRequest.IUpdate['reason'],       satisfies IEcommerceRefundRequest.IUpdate,    },  );  typia.assert(updatedRefundRequest);  // 6. Validate the response  TestValidator.equals("status should be 'rejected'", updatedRefundRequest.status, "rejected");  TestValidator.predicate(    "reason must be between 10-500 characters",    updatedRefundRequest.reason.length >= 10 && updatedRefundRequest.reason.length <= 500  );}
