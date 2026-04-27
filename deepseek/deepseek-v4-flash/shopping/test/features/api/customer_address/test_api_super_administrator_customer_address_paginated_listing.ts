import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IECommerceMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallAdministrator";
import type { IECommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCustomer";
import type { IECommerceMallCustomerAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCustomerAddress";
import type { IECommerceMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCustomerProfile";
import type { IECommerceMallSuperAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallSuperAdministrator";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIECommerceMallCustomerAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIECommerceMallCustomerAddress";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";
import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { authorize_super_administrator_join } from "../../../authorize/authorize_super_administrator_join";
import { authorize_super_administrator_login } from "../../../authorize/authorize_super_administrator_login";
import { authorize_super_administrator_refresh } from "../../../authorize/authorize_super_administrator_refresh";
import { generate_random_e_commerce_mall_customer_addresses_create } from "../../../generate/generate_random_e_commerce_mall_customer_addresses_create";
import { prepare_random_ecommerce_mall_customer_address } from "../../../prepare/prepare_random_ecommerce_mall_customer_address";

export async function test_api_super_administrator_customer_address_paginated_listing(
  connection: api.IConnection,
): Promise<void> {
  // 1. Administrator setup
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_administrator_join(adminConnection, {
    body: {
      email: "admin@test.com",
      password: "password123",
      href: "http://example.com/admin/join",
      referrer: "http://example.com/signup",
    } satisfies IECommerceMallAdministrator.IJoin,
  });
  typia.assert(adminAuth);
  // 2. Super administrator setup (promote the admin)
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdminAuth = await authorize_super_administrator_join(
    superAdminConnection,
    {
      body: {
        administrator_id: adminAuth.id,
        email: "superadmin@test.com",
        password: "password123",
        href: "http://example.com/superAdmin/join",
        referrer: "http://example.com/admin",
      },
    },
  );
  typia.assert(superAdminAuth);
  // 3. Customer setup
  const customerConnection: api.IConnection = { host: connection.host };
  const customerAuth = await authorize_customer_join(customerConnection, {
    body: {
      email: "customer@test.com",
      password: "password123",
      href: "http://example.com/customer/join",
      referrer: "http://example.com",
    } satisfies IECommerceMallCustomer.IJoin,
  });
  typia.assert(customerAuth);
  // 4. Create first shipping address (default: Alice Smith, Seoul)
  const address1 =
    await generate_random_e_commerce_mall_customer_addresses_create(
      customerConnection,
      {
        body: {
          recipient_name: "Alice Smith",
          city: "Seoul",
          is_default: true,
        },
      },
    );
  typia.assert(address1);
  // 5. Create second shipping address (non-default: Bob Jones, Busan)
  const address2 =
    await generate_random_e_commerce_mall_customer_addresses_create(
      customerConnection,
      {
        body: {
          recipient_name: "Bob Jones",
          city: "Busan",
          is_default: false,
        },
      },
    );
  typia.assert(address2);
  // 6. Super administrator lists addresses with pagination
  const page =
    await api.functional.eCommerceMall.superAdministrator.customers.addresses.index(
      superAdminConnection,
      {
        customerId: customerAuth.id,
        body: {
          page: 1,
          limit: 10,
        } satisfies IECommerceMallCustomerAddress.IRequest,
      },
    );
  typia.assert(page);
  // 7. Verify pagination metadata
  TestValidator.equals("pagination current", page.pagination.current, 1);
  TestValidator.equals("pagination limit", page.pagination.limit, 10);
  TestValidator.equals("pagination records", page.pagination.records, 2);
  TestValidator.equals("pagination pages", page.pagination.pages, 1);
  TestValidator.equals("address count", page.data.length, 2);
  // 8. Verify addresses are sorted by createdAt DESC (newest first)
  TestValidator.equals("first address is newest", page.data[0].id, address2.id);
  TestValidator.equals(
    "second address is oldest",
    page.data[1].id,
    address1.id,
  );
  // 9. Verify each address has required fields and customer reference
  for (const addr of page.data) {
    TestValidator.predicate(
      "address has customer reference",
      addr.customer !== undefined,
    );
    TestValidator.equals(
      "customer id matches",
      addr.customer.id,
      customerAuth.id,
    );
    TestValidator.equals(
      "customer email matches",
      addr.customer.email,
      customerAuth.email,
    );
  }
  // 10. Verify Address A (Alice Smith) is the default
  const aliceAddress = page.data.find((a) => a.recipientName === "Alice Smith");
  TestValidator.predicate("Alice address found", aliceAddress !== undefined);
  if (aliceAddress !== undefined) {
    TestValidator.equals("Alice is default", aliceAddress.isDefault, true);
    TestValidator.equals("Alice city", aliceAddress.city, "Seoul");
  }
  // 11. Verify Address B (Bob Jones) is non-default
  const bobAddress = page.data.find((a) => a.recipientName === "Bob Jones");
  TestValidator.predicate("Bob address found", bobAddress !== undefined);
  if (bobAddress !== undefined) {
    TestValidator.equals("Bob is not default", bobAddress.isDefault, false);
    TestValidator.equals("Bob city", bobAddress.city, "Busan");
  }
  // 12. Edge case: customer with no addresses
  const emptyCustomerConnection: api.IConnection = { host: connection.host };
  const emptyCustomerAuth = await authorize_customer_join(
    emptyCustomerConnection,
    {
      body: {
        email: "empty@test.com",
        password: "password123",
        href: "http://example.com/customer/join",
        referrer: "http://example.com",
      } satisfies IECommerceMallCustomer.IJoin,
    },
  );
  typia.assert(emptyCustomerAuth);
  const emptyPage =
    await api.functional.eCommerceMall.superAdministrator.customers.addresses.index(
      superAdminConnection,
      {
        customerId: emptyCustomerAuth.id,
        body: {} satisfies IECommerceMallCustomerAddress.IRequest,
      },
    );
  typia.assert(emptyPage);
  TestValidator.equals("empty records", emptyPage.pagination.records, 0);
  TestValidator.equals("empty data length", emptyPage.data.length, 0);
}
