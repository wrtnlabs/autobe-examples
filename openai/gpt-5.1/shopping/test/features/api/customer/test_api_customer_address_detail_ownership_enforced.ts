import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallAdminLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminLogin";
import type { IShoppingMallCountry } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCountry";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerAddress";
import type { IShoppingMallCustomerJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerJoin";
import type { IShoppingMallCustomerLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerLogin";
import type { IShoppingMallRegion } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRegion";

/**
 * Validate that customer address detail API enforces strict ownership.
 *
 * Business goal: Ensure that the address detail endpoint GET
 * /shoppingMall/customer/customers/{customerId}/addresses/{addressId} only
 * returns data to the owning customer, and rejects cross-customer access even
 * if another customer knows the combination of customerId and addressId.
 *
 * End-to-end steps:
 *
 * 1. Create Customer A and Customer B (self-service join) to obtain two distinct
 *    customer accounts and credentials.
 * 2. Create an admin actor and configure a minimal country and region required to
 *    create a valid customer address.
 * 3. As Customer B, create a shipping address bound to B.
 * 4. As Customer A, attempt to read B’s address and expect an error.
 * 5. As Customer B, read the same address successfully and verify the data matches
 *    the created address.
 */
export async function test_api_customer_address_detail_ownership_enforced(
  connection: api.IConnection,
) {
  // 1. Register two distinct customers (A and B) via auth.customer.join
  const customerAJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "Password123!" as string & tags.Format<"password">,
    ip: null,
    href: "https://customer-a.join" as string & tags.Format<"uri">,
    referrer: "https://referrer.example.com/a" as string & tags.Format<"uri">,
  } satisfies IShoppingMallCustomerJoin.IRequest;

  const customerA: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: customerAJoinBody,
    });
  typia.assert<IShoppingMallCustomer.IAuthorized>(customerA);

  const customerBJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "Password123!" as string & tags.Format<"password">,
    ip: null,
    href: "https://customer-b.join" as string & tags.Format<"uri">,
    referrer: "https://referrer.example.com/b" as string & tags.Format<"uri">,
  } satisfies IShoppingMallCustomerJoin.IRequest;

  const customerB: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: customerBJoinBody,
    });
  typia.assert<IShoppingMallCustomer.IAuthorized>(customerB);

  // 2. Create an admin actor (join) and configure minimal geography
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "AdminPass123!" as string & tags.Format<"password">,
    ip: null,
    href: "https://admin.join" as string & tags.Format<"uri">,
    referrer: "https://referrer.example.com/admin" as string &
      tags.Format<"uri">,
  } satisfies IShoppingMallAdminJoin.ICreate;

  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert<IShoppingMallAdmin.IAuthorized>(admin);

  // Admin is now authenticated; create a country
  const countryCreateBody = {
    country_code: RandomGenerator.alphabets(2).toUpperCase(),
    name_en: "Testland",
    phone_code: "+99",
    is_active: true,
    sort_order: 1 as number & tags.Type<"int32">,
  } satisfies IShoppingMallCountry.ICreate;

  const country: IShoppingMallCountry =
    await api.functional.shoppingMall.admin.countries.create(connection, {
      body: countryCreateBody,
    });
  typia.assert<IShoppingMallCountry>(country);

  // Create a region under the created country using its business code
  const regionCreateBody = {
    code: "REGION-1",
    name_en: "Test Region",
    region_type: "state",
    is_active: true,
    sort_order: 1 as number & tags.Type<"int32">,
  } satisfies IShoppingMallRegion.ICreate;

  const region: IShoppingMallRegion =
    await api.functional.shoppingMall.admin.countries.regions.create(
      connection,
      {
        countryCode: country.country_code,
        body: regionCreateBody,
      },
    );
  typia.assert<IShoppingMallRegion>(region);

  // 3. Switch authentication to Customer B via login
  const customerBLoginBody = {
    email: customerB.email,
    password: customerBJoinBody.password,
    ip: null,
    href: "https://customer-b.login" as string & tags.Format<"uri">,
    referrer: "https://referrer.example.com/b/login" as string &
      tags.Format<"uri">,
  } satisfies IShoppingMallCustomerLogin.IRequest;

  const customerBLogin: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.login(connection, {
      body: customerBLoginBody,
    });
  typia.assert<IShoppingMallCustomer.IAuthorized>(customerBLogin);

  // As Customer B, create a shipping address
  const addressCreateBodyB = {
    shopping_mall_country_id: country.id,
    shopping_mall_region_id: region.id,
    recipient_name: RandomGenerator.name(2),
    line1: RandomGenerator.paragraph({ sentences: 3, wordMin: 3, wordMax: 8 }),
    line2: null,
    city: "Test City",
    postal_code: RandomGenerator.alphaNumeric(6),
    phone_number: RandomGenerator.mobile(),
    is_default: true,
  } satisfies IShoppingMallCustomerAddress.ICreate;

  const addressB: IShoppingMallCustomerAddress =
    await api.functional.shoppingMall.customer.customers.addresses.create(
      connection,
      {
        customerId: customerB.id,
        body: addressCreateBodyB,
      },
    );
  typia.assert<IShoppingMallCustomerAddress>(addressB);

  // 4. Switch authentication to Customer A via login
  const customerALoginBody = {
    email: customerA.email,
    password: customerAJoinBody.password,
    ip: null,
    href: "https://customer-a.login" as string & tags.Format<"uri">,
    referrer: "https://referrer.example.com/a/login" as string &
      tags.Format<"uri">,
  } satisfies IShoppingMallCustomerLogin.IRequest;

  const customerALogin: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.login(connection, {
      body: customerALoginBody,
    });
  typia.assert<IShoppingMallCustomer.IAuthorized>(customerALogin);

  // 5. As Customer A, attempt to read Customer B's address → must fail
  await TestValidator.error(
    "customer A must not read customer B's address",
    async () => {
      await api.functional.shoppingMall.customer.customers.addresses.at(
        connection,
        {
          customerId: customerB.id,
          addressId: addressB.id,
        },
      );
    },
  );

  // 6. Switch back to Customer B and verify that B can read their own address
  const customerBLoginAgain: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.login(connection, {
      body: customerBLoginBody,
    });
  typia.assert<IShoppingMallCustomer.IAuthorized>(customerBLoginAgain);

  const addressBReloaded: IShoppingMallCustomerAddress =
    await api.functional.shoppingMall.customer.customers.addresses.at(
      connection,
      {
        customerId: customerB.id,
        addressId: addressB.id,
      },
    );
  typia.assert<IShoppingMallCustomerAddress>(addressBReloaded);

  // 7. Verify key invariants between created and reloaded address
  TestValidator.equals(
    "address id must be stable for customer B",
    addressBReloaded.id,
    addressB.id,
  );
  TestValidator.equals(
    "address owner must remain customer B",
    addressBReloaded.shopping_mall_customer_id,
    addressB.shopping_mall_customer_id,
  );
  TestValidator.equals(
    "recipient_name must be preserved",
    addressBReloaded.recipient_name,
    addressB.recipient_name,
  );
  TestValidator.equals(
    "postal_code must be preserved",
    addressBReloaded.postal_code,
    addressB.postal_code,
  );
}
