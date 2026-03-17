import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAddress";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import type { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import type { IEcommerceMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallRefundRequest";
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
import { generate_random_ecommerce_mall_customer_refund_requests_create } from "../../../generate/generate_random_ecommerce_mall_customer_refund_requests_create";
import { prepare_random_ecommerce_mall_refund_request } from "../../../prepare/prepare_random_ecommerce_mall_refund_request";

export async function test_api_refund_request_admin_overview(
  connection: api.IConnection,
): Promise<void> {
  // 1. Setup Admin account
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphaNumeric(16);
  const adminHref = typia.random<string & tags.Format<"uri">>();
  const adminReferrer = typia.random<string & tags.Format<"uri">>();
  const adminIp = typia.random<string & tags.Format<"ipv4">>();
  const adminBaseConnection: api.IConnection = { host: connection.host };
  const adminResponse = await authorize_admin_join(adminBaseConnection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      href: adminHref,
      referrer: adminReferrer,
      ip: adminIp,
    },
  });
  typia.assert(adminResponse);
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_login(adminConnection, {
    body: {
      email: adminResponse.email,
      password: adminPassword,
    },
  });
  // 2. Setup Customer account
  const customerEmail = typia.random<string & tags.Format<"email">>();
  const customerPassword = RandomGenerator.alphaNumeric(16);
  const customerHref = typia.random<string & tags.Format<"uri">>();
  const customerReferrer = typia.random<string & tags.Format<"uri">>();
  const customerIp = typia.random<string & tags.Format<"ipv4">>();
  const customerBaseConnection: api.IConnection = { host: connection.host };
  const customerResponse = await authorize_customer_join(
    customerBaseConnection,
    {
      body: {
        email: customerEmail,
        password: customerPassword,
        href: customerHref,
        referrer: customerReferrer,
        ip: customerIp,
      },
    },
  );
  typia.assert(customerResponse);
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_login(customerConnection, {
    body: {
      email: customerResponse.email,
      password: customerPassword,
      href: customerHref,
      referrer: customerReferrer,
      ip: customerIp,
    },
  });
  // 3. Generate order item ID for refund request
  // Note: Order item must exist in the system with 'delivered' status
  const orderItemId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // 4. Customer creates refund request
  const refundRequest =
    await generate_random_ecommerce_mall_customer_refund_requests_create(
      customerConnection,
      {
        body: {
          reason: RandomGenerator.paragraph({ sentences: 3 }),
        },
        params: {
          orderItemId,
        },
      },
    );
  typia.assert(refundRequest);
  // 5. Admin retrieves the refund request (oversight capability)
  const retrievedRefundRequest =
    await api.functional.ecommerceMall.admin.refund_requests.at(
      adminConnection,
      {
        refundRequestId: refundRequest.id,
      },
    );
  typia.assert(retrievedRefundRequest);
  // 6. Validate admin can access customer's refund request
  TestValidator.equals(
    "refund request ID matches",
    retrievedRefundRequest.id,
    refundRequest.id,
  );
  // 7. Validate customer information is correctly shown in admin view
  TestValidator.equals(
    "customer ID matches original customer",
    retrievedRefundRequest.customer.id,
    customerResponse.id,
  );
  TestValidator.equals(
    "customer email matches original customer",
    retrievedRefundRequest.customer.email,
    customerResponse.email,
  );
  // 8. Validate all refund request fields are populated
  TestValidator.equals(
    "refund code is present",
    retrievedRefundRequest.refundCode.length > 0,
    true,
  );
  TestValidator.equals(
    "status is present",
    retrievedRefundRequest.status !== undefined,
    true,
  );
  TestValidator.equals(
    "reason is present",
    retrievedRefundRequest.reason.length > 0,
    true,
  );
  TestValidator.equals(
    "customer relationship has all required fields",
    retrievedRefundRequest.customer.id !== undefined &&
      retrievedRefundRequest.customer.email !== undefined &&
      retrievedRefundRequest.customer.status !== undefined &&
      retrievedRefundRequest.customer.created_at !== undefined,
    true,
  );
  // 9. Validate admin can see all timestamps
  TestValidator.equals(
    "created_at timestamp is present",
    retrievedRefundRequest.createdAt !== undefined,
    true,
  );
  TestValidator.equals(
    "updated_at timestamp is present",
    retrievedRefundRequest.updatedAt !== undefined,
    true,
  );
}
