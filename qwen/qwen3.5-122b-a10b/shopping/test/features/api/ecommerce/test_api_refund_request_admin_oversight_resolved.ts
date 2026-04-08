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
 * Test administrator oversight of resolved refund requests.
 *
 * Validates that administrators can retrieve refund requests with complete audit trail information including seller responses. The test verifies the admin endpoint returns all refund request fields with proper timestamps and order item summaries.
 *
 * This test focuses on the admin retrieval capability and response structure validation. The approved/rejected status scenarios would require seller resolution endpoints to actually transition the refund request status.
 *
 * 1. Create and authenticate administrator account
 * 2. Create and authenticate customer account
 * 3. Generate UUIDs for order and order item (simulation mode will handle validation)
 * 4. Customer creates a refund request with reason
 * 5. Administrator retrieves the refund request via admin oversight endpoint
 * 6. Validate response structure and all fields are present with typia.assert()
 */
export async function test_api_refund_request_admin_oversight_resolved(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create and authenticate administrator
  const adminPassword = RandomGenerator.alphaNumeric(16);
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminConnection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      reason: RandomGenerator.paragraph(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(adminAuth);
  // Login as administrator for subsequent admin operations
  const adminLoginConnection: api.IConnection = { host: connection.host };
  const adminLogin = await authorize_admin_login(adminLoginConnection, {
    body: {
      email: adminEmail,
      password: adminPassword,
    },
  });
  typia.assert(adminLogin);
  // 2. Create and authenticate customer
  const customerPassword = RandomGenerator.alphaNumeric(16);
  const customerEmail = typia.random<string & tags.Format<"email">>();
  const customerConnection: api.IConnection = { host: connection.host };
  const customerAuth = await authorize_customer_join(customerConnection, {
    body: {
      email: customerEmail,
      password: customerPassword,
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(customerAuth);
  // Login as customer for refund request creation
  const customerLoginConnection: api.IConnection = { host: connection.host };
  const customerLogin = await authorize_customer_login(
    customerLoginConnection,
    {
      body: {
        email: customerEmail,
        password: customerPassword,
      },
    },
  );
  typia.assert(customerLogin);
  // 3. Generate UUIDs for order and order item (simulation mode will handle validation)
  const orderId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  const itemId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // 4. Customer creates refund request
  const refundRequest =
    await generate_random_ecommerce_customer_orders_items_refund_requests_create(
      customerLoginConnection,
      {
        body: {
          reason: RandomGenerator.paragraph(),
        },
        params: {
          orderId,
          itemId,
        },
      },
    );
  typia.assert(refundRequest);
  // 5. Administrator retrieves the refund request via admin oversight endpoint
  const retrievedRefundRequest =
    await api.functional.ecommerce.admin.orders.items.refund_requests.at(
      adminLoginConnection,
      {
        orderId,
        itemId,
        requestId: refundRequest.id,
      },
    );
  typia.assert(retrievedRefundRequest);
  // 6. Validate response structure
  TestValidator.equals(
    "refund request id matches",
    retrievedRefundRequest.id,
    refundRequest.id,
  );
  TestValidator.equals(
    "order item id matches",
    retrievedRefundRequest.orderItem.id,
    itemId,
  );
  TestValidator.predicate(
    "reason is not empty",
    retrievedRefundRequest.reason.length > 0,
  );
  TestValidator.predicate(
    "status is valid",
    ["pending", "approved", "rejected"].includes(retrievedRefundRequest.status),
  );
  TestValidator.predicate(
    "created_at is valid timestamp",
    /\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(
      retrievedRefundRequest.created_at,
    ),
  );
  TestValidator.predicate(
    "updated_at is valid timestamp",
    /\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(
      retrievedRefundRequest.updated_at,
    ),
  );
}