import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAddress";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { generate_random_ecommerce_mall_customer_addresses_create } from "../../../generate/generate_random_ecommerce_mall_customer_addresses_create";
import { prepare_random_ecommerce_mall_address } from "../../../prepare/prepare_random_ecommerce_mall_address";

export async function test_api_customer_address_creation_complete_workflow(
  connection: api.IConnection,
): Promise<void> {
  // 1. Customer Registration - Join platform
  const customerConnection: api.IConnection = { host: connection.host };
  const customer = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "TestPass123!",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IEcommerceMallCustomer.IJoin,
  });
  typia.assert(customer);
  // 2. Create first shipping address (should be auto-default)
  const address1 = await api.functional.ecommerceMall.customer.addresses.create(
    customerConnection,
    {
      body: {
        recipient_name: "John Doe",
        recipient_phone: "555-123-4567",
        street: "123 Main Street",
        city: "Seoul",
        state: "Seoul",
      } satisfies IEcommerceMallAddress.ICreate,
    },
  );
  typia.assert(address1);
  // 3. Validate first address has is_default = true
  TestValidator.equals("first address is_default", address1.is_default, true);
  // 4. Validate address data integrity
  TestValidator.equals(
    "recipient_name preserved",
    address1.recipient_name,
    "John Doe",
  );
  TestValidator.equals(
    "recipient_phone preserved",
    address1.recipient_phone,
    "555-123-4567",
  );
  TestValidator.equals("street preserved", address1.street, "123 Main Street");
  TestValidator.equals("city preserved", address1.city, "Seoul");
  TestValidator.equals("state preserved", address1.state, "Seoul");
  // 5. Validate active status (deleted_at = null)
  TestValidator.equals("address active", address1.deleted_at, null);
  // 6. Validate required fields exist (type already guaranteed)
  const _id: string & tags.Format<"uuid"> = address1.id;
  const _customerId: string & tags.Format<"uuid"> =
    address1.ecommerce_mall_customer_id;
  const _createdAt: string & tags.Format<"date-time"> = address1.created_at;
  const _updatedAt: string & tags.Format<"date-time"> = address1.updated_at;
  // 7. Create second address (should NOT be default)
  const address2 = await api.functional.ecommerceMall.customer.addresses.create(
    customerConnection,
    {
      body: {
        recipient_name: "Jane Smith",
        recipient_phone: "555-987-6543",
        street: "456 Oak Avenue",
        city: "Busan",
        state: "Busan",
      } satisfies IEcommerceMallAddress.ICreate,
    },
  );
  typia.assert(address2);
  // 8. Validate second address has is_default = false
  TestValidator.equals("second address is_default", address2.is_default, false);
  // 9. Validate both addresses have unique IDs
  TestValidator.notEquals(
    "addresses have unique IDs",
    address1.id,
    address2.id,
  );
}
