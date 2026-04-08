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
import { generate_random_ecommerce_mall_member_customer_addresses_create } from "../../../generate/generate_random_ecommerce_mall_member_customer_addresses_create";
import { generate_random_ecommerce_mall_member_orders_create } from "../../../generate/generate_random_ecommerce_mall_member_orders_create";
import { prepare_random_ecommerce_mall_customer_address } from "../../../prepare/prepare_random_ecommerce_mall_customer_address";
import { prepare_random_ecommerce_mall_order } from "../../../prepare/prepare_random_ecommerce_mall_order";
import { prepare_random_ecommerce_mall_order_item } from "../../../prepare/prepare_random_ecommerce_mall_order_item";

export async function test_api_address_delete_in_use_by_pending_order(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register customer account
  const customerConnection: api.IConnection = { host: connection.host };
  const joinResult = await api.functional.ecommerceMall.auth.member.join(
    customerConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        display_name: RandomGenerator.name(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IEcommerceMallMember.IJoin,
    },
  );
  typia.assert(joinResult);
  // 2. Create two addresses for customer
  const address1 =
    await api.functional.ecommerceMall.member.customer.addresses.create(
      customerConnection,
      {
        body: {
          recipient_name: RandomGenerator.name(),
          phone: RandomGenerator.mobile(),
          street: RandomGenerator.paragraph({ sentences: 2 }),
          city: RandomGenerator.name(2),
          state: RandomGenerator.name(2),
          postal_code: typia
            .random<string & tags.Format<"email">>()
            .replace(/[^0-9]/g, ""),
          country: "KR",
        } satisfies IEcommerceMallCustomerAddress.ICreate,
      },
    );
  typia.assert(address1);
  const address2 =
    await api.functional.ecommerceMall.member.customer.addresses.create(
      customerConnection,
      {
        body: {
          recipient_name: RandomGenerator.name(),
          phone: RandomGenerator.mobile(),
          street: RandomGenerator.paragraph({ sentences: 2 }),
          city: RandomGenerator.name(2),
          state: RandomGenerator.name(2),
          postal_code: typia
            .random<string & tags.Format<"email">>()
            .replace(/[^0-9]/g, ""),
          country: "US",
          is_default: false,
        } satisfies IEcommerceMallCustomerAddress.ICreate,
      },
    );
  typia.assert(address2);
  // 3. Create order using first address
  const order = await api.functional.ecommerceMall.member.orders.create(
    customerConnection,
    {
      body: {
        shipping_address_id: address1.id,
        order_items: [
          {
            product_variant_id: typia.random<string & tags.Format<"uuid">>(),
            quantity: 1,
          } satisfies IEcommerceMallOrderItem.ICreate,
        ],
      } satisfies IEcommerceMallOrder.ICreate,
    },
  );
  typia.assert(order);
  // Verify order uses address1
  TestValidator.equals(
    "order uses first address",
    order.shippingAddress.id,
    address1.id,
  );
  // 4. Attempt to delete address1 (used by pending order) - should fail with 409
  await TestValidator.error(
    "cannot delete address used by pending order",
    async () => {
      await api.functional.ecommerceMall.member.addresses.erase(
        customerConnection,
        {
          addressId: address1.id,
        },
      );
    },
  );
  // Verify address1 still exists
  // Note: We cannot directly query addresses, but we can verify the delete failed
  // by checking the error was thrown
  // 5. Delete address2 (not used by any order) - should succeed
  await api.functional.ecommerceMall.member.addresses.erase(
    customerConnection,
    {
      addressId: address2.id,
    },
  );
  // Verify address2 was deleted successfully
  // Note: The API returns void on success, which indicates successful deletion
}
