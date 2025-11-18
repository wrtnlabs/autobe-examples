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

/**
 * Verify that customer shipping address updates enforce ownership boundaries.
 *
 * This test exercises the customer address update endpoint to ensure that:
 *
 * - A customer cannot update another customer's address (ownership is enforced)
 * - The legitimate owner (Customer A) can still successfully update their own
 *   address
 *
 * Business flow:
 *
 * 1. Register and authenticate an admin, then create a country master record.
 * 2. Register Customer A (join) to obtain an authenticated customer session and
 *    id.
 * 3. As Customer A, create a shipping address bound to that customer using the
 *    newly created country.
 * 4. Register Customer B (another join), which implicitly authenticates as B.
 * 5. While authenticated as Customer B, attempt to update Customer A's address by
 *    calling the update API with Customer B's customerId but A's addressId.
 *    This must fail due to ownership enforcement.
 * 6. Re-authenticate as Customer A using the login API.
 * 7. As Customer A, perform a valid update of the same address and verify that the
 *    update succeeds and that the response reflects the applied changes while
 *    preserving identity fields (id, shopping_mall_customer_id).
 */
export async function test_api_customer_address_update_ownership_enforcement(
  connection: api.IConnection,
) {
  // 1. Admin join & login to create a country
  const adminEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const adminPassword: string & tags.Format<"password"> = typia.random<
    string & tags.Format<"password">
  >();

  const adminJoinBody = {
    email: adminEmail,
    password: adminPassword,
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/landing",
  } satisfies IShoppingMallAdminJoin.ICreate;

  const adminJoin = await api.functional.auth.admin.join(connection, {
    body: adminJoinBody,
  });
  typia.assert<IShoppingMallAdmin.IAuthorized>(adminJoin);

  const adminLoginBody = {
    email: adminEmail,
    password: adminPassword,
    href: "https://admin.example.com/login",
    referrer: "https://admin.example.com/landing",
    ip: "127.0.0.1",
  } satisfies IShoppingMallAdminLogin.ICreate;

  const adminLogin = await api.functional.auth.admin.login(connection, {
    body: adminLoginBody,
  });
  typia.assert<IShoppingMallAdmin.IAuthorized>(adminLogin);

  // Create a country master record
  const countryCreateBody = {
    country_code: "KR",
    name_en: "Korea, Republic of",
    phone_code: "+82",
    is_active: true,
    sort_order: 1,
  } satisfies IShoppingMallCountry.ICreate;

  const country = await api.functional.shoppingMall.admin.countries.create(
    connection,
    { body: countryCreateBody },
  );
  typia.assert<IShoppingMallCountry>(country);

  // 2. Register Customer A via join (implicitly authenticates as A)
  const customerAEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const customerAPassword: string & tags.Format<"password"> = typia.random<
    string & tags.Format<"password">
  >();

  const customerAJoinBody = {
    email: customerAEmail,
    password: customerAPassword,
    href: "https://shop.example.com/join",
    referrer: "https://shop.example.com/home",
  } satisfies IShoppingMallCustomerJoin.IRequest;

  const customerAAuth = await api.functional.auth.customer.join(connection, {
    body: customerAJoinBody,
  });
  typia.assert<IShoppingMallCustomer.IAuthorized>(customerAAuth);
  const customerAId = customerAAuth.id;

  // 3. As Customer A, create a shipping address
  const addressCreateBody = {
    shopping_mall_country_id: country.id,
    shopping_mall_region_id: null,
    recipient_name: RandomGenerator.name(2),
    line1: "123 Gangnam-daero",
    line2: "Apt 101",
    city: "Seoul",
    postal_code: "06236",
    phone_number: RandomGenerator.mobile("010"),
    is_default: true,
  } satisfies IShoppingMallCustomerAddress.ICreate;

  const address =
    await api.functional.shoppingMall.customer.customers.addresses.create(
      connection,
      {
        customerId: customerAId,
        body: addressCreateBody,
      },
    );
  typia.assert<IShoppingMallCustomerAddress>(address);

  // 4. Register Customer B via join (implicitly authenticates as B)
  const customerBEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const customerBPassword: string & tags.Format<"password"> = typia.random<
    string & tags.Format<"password">
  >();

  const customerBJoinBody = {
    email: customerBEmail,
    password: customerBPassword,
    href: "https://shop.example.com/join",
    referrer: "https://shop.example.com/campaign",
  } satisfies IShoppingMallCustomerJoin.IRequest;

  const customerBAuth = await api.functional.auth.customer.join(connection, {
    body: customerBJoinBody,
  });
  typia.assert<IShoppingMallCustomer.IAuthorized>(customerBAuth);
  const customerBId = customerBAuth.id;

  // 5. While authenticated as Customer B, attempt to update Customer A's address
  const forbiddenUpdateBody = {
    recipient_name: RandomGenerator.name(2),
    city: "Busan",
    is_default: false,
  } satisfies IShoppingMallCustomerAddress.IUpdate;

  await TestValidator.error(
    "customer B must not be able to update customer A's address",
    async () => {
      await api.functional.shoppingMall.customer.customers.addresses.update(
        connection,
        {
          customerId: customerBId,
          addressId: address.id,
          body: forbiddenUpdateBody,
        },
      );
    },
  );

  // 6. Re-authenticate as Customer A using login
  const customerALoginBody = {
    email: customerAEmail,
    password: customerAPassword,
    href: "https://shop.example.com/login",
    referrer: "https://shop.example.com/home",
    ip: "127.0.0.1",
  } satisfies IShoppingMallCustomerLogin.IRequest;

  const customerALogin = await api.functional.auth.customer.login(connection, {
    body: customerALoginBody,
  });
  typia.assert<IShoppingMallCustomer.IAuthorized>(customerALogin);

  // 7. As Customer A, perform a valid update and verify success
  const allowedUpdateBody = {
    recipient_name: RandomGenerator.name(2),
    city: "Incheon",
    line2: "Suite 202",
    is_default: true,
  } satisfies IShoppingMallCustomerAddress.IUpdate;

  const updatedAddress =
    await api.functional.shoppingMall.customer.customers.addresses.update(
      connection,
      {
        customerId: customerAId,
        addressId: address.id,
        body: allowedUpdateBody,
      },
    );
  typia.assert<IShoppingMallCustomerAddress>(updatedAddress);

  // Identity must be preserved
  TestValidator.equals(
    "address id must remain the same after update",
    updatedAddress.id,
    address.id,
  );
  TestValidator.equals(
    "shopping_mall_customer_id must remain bound to customer A",
    updatedAddress.shopping_mall_customer_id,
    customerAId,
  );

  // Updated fields should reflect the allowedUpdateBody values
  if (allowedUpdateBody.recipient_name !== undefined) {
    TestValidator.equals(
      "recipient_name should be updated",
      updatedAddress.recipient_name,
      allowedUpdateBody.recipient_name,
    );
  }
  if (allowedUpdateBody.city !== undefined) {
    TestValidator.equals(
      "city should be updated",
      updatedAddress.city,
      allowedUpdateBody.city,
    );
  }
  if (allowedUpdateBody.line2 !== undefined) {
    TestValidator.equals(
      "line2 should be updated",
      updatedAddress.line2,
      allowedUpdateBody.line2,
    );
  }
  if (allowedUpdateBody.is_default !== undefined) {
    TestValidator.equals(
      "is_default should be updated",
      updatedAddress.is_default,
      allowedUpdateBody.is_default,
    );
  }
}
