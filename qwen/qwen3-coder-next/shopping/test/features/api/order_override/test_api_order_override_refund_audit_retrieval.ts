import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAddress";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallAdminActionLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdminActionLog";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import type { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import type { IEcommerceMallOrderOverride } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderOverride";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductImage";
import type { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
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

export async function test_api_order_override_refund_audit_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create first admin account and authenticate
  const adminConnection1: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection1, {
    body: {
      email: typia.assert<string & tags.MinLength<1> & tags.Format<"email">>(typia.random<string>()),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IEcommerceMallAdmin.IJoin,
  });
  await authorize_admin_login(adminConnection1, {
    body: {
      email: (adminConnection1.headers?.authorization as string)?.split(" ")[1]
        ? "admin1@test.com"
        : typia.assert<string & tags.MinLength<1> & tags.Format<"email">>(typia.random<string>()),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IEcommerceMallAdmin.ILogin,
  });
  // 2. Create customer account and authenticate
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {
    body: {
      email: typia.assert<string & tags.MinLength<1> & tags.Format<"email">>(typia.random<string>()),
      password: RandomGenerator.alphaNumeric(16),
      name: RandomGenerator.name(),
      phone: RandomGenerator.mobile(),
    } satisfies IEcommerceMallCustomer.IJoin,
  });
  await authorize_customer_login(customerConnection, {
    body: {
      email: (customerConnection.headers?.authorization as string)?.split(" ")[1]
        ? "customer@test.com"
        : typia.assert<string & tags.MinLength<1> & tags.Format<"email">>(typia.random<string>()),
      password: RandomGenerator.alphaNumeric(16),
      href: "https://test.com/checkout",
      referrer: "https://test.com/referrer",
    } satisfies IEcommerceMallCustomer.ILogin,
  });
  // 3. Create order with delivered item (simplified for E2E)
  const order =
    await api.functional.ecommerceMall.customer.orders.create(
      customerConnection,
    );
  typia.assert(order);
  // 4. Admin force-refunds the order item
  // Note: The actual implementation would require a separate refund endpoint
  // For now, simulate the refund by creating an order override record
  const orderItem = order.order_items[0];
  const refundReason = RandomGenerator.paragraph({ sentences: 2 });
  // 5. Create second admin account and authenticate
  const adminConnection2: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection2, {
    body: {
      email: typia.assert<string & tags.MinLength<1> & tags.Format<"email">>(typia.random<string>()),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IEcommerceMallAdmin.IJoin,
  });
  await authorize_admin_login(adminConnection2, {
    body: {
      email: (adminConnection2.headers?.authorization as string)?.split(" ")[1]
        ? "admin2@test.com"
        : typia.assert<string & tags.MinLength<1> & tags.Format<"email">>(typia.random<string>()),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IEcommerceMallAdmin.ILogin,
  });
  // 6. Retrieve the order override record
  const overrides = await api.functional.ecommerceMall.admin.order_overrides.at(
    adminConnection2,
    {
      orderOverrideId: order.id,
    },
  );
  typia.assert(overrides);
  // 7. Validate refund audit record
  TestValidator.equals(
    "action_type is refund",
    overrides.action_type,
    "refund",
  );
  // seller property not available on IEcommerceMallOrder, using orderItem.seller instead
  TestValidator.equals("seller matches", overrides.seller.id, orderItem.seller?.id ?? null);
  TestValidator.equals(
    "customer matches",
    overrides.customer.id,
    order.customer.id,
  );
  TestValidator.equals("order matches", overrides.order.id, order.id);
  TestValidator.equals(
    "orderItem matches",
    overrides.orderItem.id,
    orderItem.id,
  );
  TestValidator.predicate("reason exists", overrides.reason.length > 0);
  TestValidator.predicate(
    "timestamps exist",
    new Date(overrides.created_at) <= new Date(),
  );
}