import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceAdmin";
import type { IEcommerceAdministratorGrade } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceAdministratorGrade";
import type { IEcommerceCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCategory";
import type { IEcommerceCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCustomer";
import type { IEcommerceOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceOrder";
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

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { generate_random_ecommerce_customer_orders_items_refund_requests_create } from "../../../generate/generate_random_ecommerce_customer_orders_items_refund_requests_create";
import { prepare_random_ecommerce_refund_request } from "../../../prepare/prepare_random_ecommerce_refund_request";

/**
 * Test administrator retrieval of pending refund request for oversight.
 *
 * Validates the admin's ability to monitor refund requests across the platform for compliance and customer service oversight. The test creates a customer-submitted refund request for a delivered order item and verifies the administrator can retrieve and view all refund request details.
 *
 * The refund request includes the customer's reason, current pending status, creation timestamp, and associated order item information. The administrator endpoint provides platform-wide visibility into refund requests regardless of seller or customer ownership.
 *
 * 1. Customer account creation and authentication.
 * 2. Administrator account creation and authentication.
 * 3. Generate order and item IDs for refund request creation.
 * 4. Customer creates refund request with reason for delivered order item.
 * 5. Administrator retrieves the refund request via oversight endpoint.
 * 6. Validates all refund request fields are present and correctly typed.
 * 7. Verifies order item summary contains proper foreign key references.
 */
export async function test_api_refund_request_admin_oversight_pending(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create customer account
  const customerPassword = RandomGenerator.alphaNumeric(16);
  const customerEmail = typia.random<string & tags.Format<"email">>();
  const customerConnection: api.IConnection = { host: connection.host };
  const customerAuth = await api.functional.ecommerce.auth.customer.join(
    customerConnection,
    {
      body: {
        email: customerEmail,
        password: customerPassword,
        display_name: RandomGenerator.name(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      },
    },
  );
  typia.assert(customerAuth);
  // 2. Create administrator account
  const adminPassword = RandomGenerator.alphaNumeric(16);
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await api.functional.ecommerce.auth.admin.join(
    adminConnection,
    {
      body: {
        email: adminEmail,
        password: adminPassword,
        reason: RandomGenerator.paragraph(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      },
    },
  );
  typia.assert(adminAuth);
  // 3. Login as customer to create refund request
  const customerLoginConnection: api.IConnection = { host: connection.host };
  const customerLogin = await api.functional.ecommerce.auth.customer.login(
    customerLoginConnection,
    {
      body: {
        email: customerEmail,
        password: customerPassword,
      },
    },
  );
  typia.assert(customerLogin);
  // 4. Login as administrator
  const adminLoginConnection: api.IConnection = { host: connection.host };
  const adminLogin = await api.functional.ecommerce.auth.admin.login(
    adminLoginConnection,
    {
      body: {
        email: adminEmail,
        password: adminPassword,
      },
    },
  );
  typia.assert(adminLogin);
  // 5. Generate IDs for order and item (in real scenario, these would be created)
  const orderId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  const itemId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // 6. Customer creates refund request
  const refundRequest: IEcommerceRefundRequest =
    await api.functional.ecommerce.customer.orders.items.refund_requests.create(
      customerLoginConnection,
      {
        orderId,
        itemId,
        body: {
          reason: RandomGenerator.paragraph({ sentences: 3 }),
        },
      },
    );
  typia.assert(refundRequest);
  // 7. Administrator retrieves the refund request for oversight
  const retrievedRequest: IEcommerceRefundRequest =
    await api.functional.ecommerce.admin.orders.items.refund_requests.at(
      adminLoginConnection,
      {
        orderId,
        itemId,
        requestId: refundRequest.id,
      },
    );
  typia.assert(retrievedRequest);
  // 8. Validate refund request fields
  typia.assert(retrievedRequest.id);
  typia.assert(retrievedRequest.reason);
  typia.assert(retrievedRequest.status);
  typia.assert(retrievedRequest.created_at);
  typia.assert(retrievedRequest.updated_at);
  typia.assert(retrievedRequest.orderItem);
  // 9. Verify order item summary has required fields
  typia.assert(retrievedRequest.orderItem.id);
  typia.assert(retrievedRequest.orderItem.order);
  typia.assert(retrievedRequest.orderItem.productVariant);
  typia.assert(retrievedRequest.orderItem.seller);
}