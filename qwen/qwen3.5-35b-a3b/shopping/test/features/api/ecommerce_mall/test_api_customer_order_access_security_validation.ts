import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallCustomerAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomerAddress";
import type { IEcommerceMallMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallMember";
import type { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import type { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShipment";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_ecommerce_mall_member_orders_create } from "../../../generate/generate_random_ecommerce_mall_member_orders_create";
import { prepare_random_ecommerce_mall_order } from "../../../prepare/prepare_random_ecommerce_mall_order";
import { prepare_random_ecommerce_mall_order_item } from "../../../prepare/prepare_random_ecommerce_mall_order_item";

export async function test_api_customer_order_access_security_validation(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Register Customer A
  const customerAConnection: api.IConnection = { host: connection.host };
  const customerA = await authorize_member_join(customerAConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      phone_number: RandomGenerator.mobile(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(customerA);
  // Step 2: Register Customer B
  const customerBConnection: api.IConnection = { host: connection.host };
  const customerB = await authorize_member_join(customerBConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      phone_number: RandomGenerator.mobile(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(customerB);
  // Step 3: Customer B creates an order (using utility for proper data setup)
  const customerBOrder =
    await generate_random_ecommerce_mall_member_orders_create(
      customerBConnection,
      {},
    );
  typia.assert(customerBOrder);
  // Step 4: Customer A attempts to access Customer B's order
  // Should return 404 (not found) to prevent information leakage
  await TestValidator.error(
    "Customer A cannot access Customer B's order (returns 404)",
    async () => {
      await api.functional.ecommerceMall.member.orders.at(customerAConnection, {
        id: customerBOrder.id,
      });
    },
  );
  // Step 5: Customer B can access their own order (control test)
  const customerBOwnAccess =
    await api.functional.ecommerceMall.member.orders.at(customerBConnection, {
      id: customerBOrder.id,
    });
  typia.assert(customerBOwnAccess);
  TestValidator.equals(
    "Customer B can access their own order",
    customerBOwnAccess.id,
    customerBOrder.id,
  );
  // Step 6: Verify customer information in the order matches Customer B
  TestValidator.equals(
    "Order member matches Customer B",
    customerBOwnAccess.member.id,
    customerB.id,
  );
  TestValidator.equals(
    "Order member email matches Customer B",
    customerBOwnAccess.member.email,
    customerB.email,
  );
}
