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
 * Validate successful update of basic fields on a customer shipping address.
 *
 * Business intent:
 *
 * - A customer can maintain a list of shipping addresses under their account.
 * - Each address can be updated for mutable fields such as recipient name,
 *   address lines, city, postal code, phone number, and whether it is the
 *   default shipping address.
 * - Core identity and ownership fields (id, shopping_mall_customer_id,
 *   shopping_mall_country_id) must remain stable when only basic fields are
 *   updated.
 * - Timestamps must behave as expected: created_at is immutable while updated_at
 *   advances when changes are applied.
 *
 * Test flow:
 *
 * 1. Create and authenticate an admin (for country master setup) via
 *    /auth/admin/join.
 * 2. As this admin, create a country via /shoppingMall/admin/countries using
 *    IShoppingMallCountry.ICreate.
 * 3. Create and authenticate a customer via /auth/customer/join and keep the
 *    returned customer id.
 * 4. As the authenticated customer, create an initial address via POST
 *    /shoppingMall/customer/customers/{customerId}/addresses using
 *    IShoppingMallCustomerAddress.ICreate, pointing to the created country.
 * 5. Update the address via PUT
 *    /shoppingMall/customer/customers/{customerId}/addresses/{addressId} using
 *    IShoppingMallCustomerAddress.IUpdate, changing basic fields
 *    (recipient_name, line1, line2, city, postal_code, phone_number,
 *    is_default).
 * 6. Assert that:
 *
 *    - The response type matches IShoppingMallCustomerAddress.
 *    - Immutable fields (id, shopping_mall_customer_id, shopping_mall_country_id)
 *         are preserved.
 *    - Basic fields reflect the new values from the update request.
 *    - Created_at is unchanged while updated_at has changed.
 */
export async function test_api_customer_address_update_basic_fields(
  connection: api.IConnection,
) {
  // 1. Admin join (creates an admin and authenticates as that admin)
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallAdminJoin.ICreate;

  const adminAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);

  // 2. Create a country as admin
  const countryCreateBody = {
    country_code: RandomGenerator.alphabets(2).toUpperCase(),
    name_en: RandomGenerator.paragraph({ sentences: 2 }),
    phone_code: "+" + RandomGenerator.alphaNumeric(2),
    is_active: true,
    sort_order: 1 satisfies number as number,
  } satisfies IShoppingMallCountry.ICreate;

  const country: IShoppingMallCountry =
    await api.functional.shoppingMall.admin.countries.create(connection, {
      body: countryCreateBody,
    });
  typia.assert(country);

  // 3. Customer join (creates customer and authenticates as that customer)
  const customerJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallCustomerJoin.IRequest;

  const customerAuthorized: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: customerJoinBody,
    });
  typia.assert(customerAuthorized);

  const customerId = customerAuthorized.id;

  // 4. Create an initial address for this customer
  const initialAddressBody = {
    shopping_mall_country_id: country.id,
    shopping_mall_region_id: null,
    recipient_name: RandomGenerator.paragraph({ sentences: 2 }),
    line1: RandomGenerator.paragraph({ sentences: 2 }),
    line2: RandomGenerator.paragraph({ sentences: 2 }),
    city: RandomGenerator.paragraph({ sentences: 1 }),
    postal_code: RandomGenerator.alphaNumeric(6),
    phone_number: RandomGenerator.mobile(),
    is_default: true,
  } satisfies IShoppingMallCustomerAddress.ICreate;

  const originalAddress: IShoppingMallCustomerAddress =
    await api.functional.shoppingMall.customer.customers.addresses.create(
      connection,
      {
        customerId,
        body: initialAddressBody,
      },
    );
  typia.assert(originalAddress);

  // 5. Update the address basic fields
  const updatedRecipientName = RandomGenerator.paragraph({ sentences: 2 });
  const updatedLine1 = RandomGenerator.paragraph({ sentences: 2 });
  const updatedLine2 = RandomGenerator.paragraph({ sentences: 1 });
  const updatedCity = RandomGenerator.paragraph({ sentences: 1 });
  const updatedPostalCode = RandomGenerator.alphaNumeric(6);
  const updatedPhoneNumber = RandomGenerator.mobile();
  const updatedIsDefault = false;

  const updateBody = {
    recipient_name: updatedRecipientName,
    line1: updatedLine1,
    line2: updatedLine2,
    city: updatedCity,
    postal_code: updatedPostalCode,
    phone_number: updatedPhoneNumber,
    is_default: updatedIsDefault,
  } satisfies IShoppingMallCustomerAddress.IUpdate;

  const updatedAddress: IShoppingMallCustomerAddress =
    await api.functional.shoppingMall.customer.customers.addresses.update(
      connection,
      {
        customerId,
        addressId: originalAddress.id,
        body: updateBody,
      },
    );
  typia.assert(updatedAddress);

  // 6. Business validations
  // Immutable identity and ownership
  TestValidator.equals(
    "address id should remain unchanged after update",
    updatedAddress.id,
    originalAddress.id,
  );
  TestValidator.equals(
    "customer id should remain unchanged on address",
    updatedAddress.shopping_mall_customer_id,
    originalAddress.shopping_mall_customer_id,
  );
  TestValidator.equals(
    "shopping_mall_customer_id must equal authenticated customer id",
    updatedAddress.shopping_mall_customer_id,
    customerId,
  );
  TestValidator.equals(
    "country id should remain unchanged when not updated",
    updatedAddress.shopping_mall_country_id,
    originalAddress.shopping_mall_country_id,
  );

  // Updated fields must match the request body
  TestValidator.equals(
    "recipient_name should be updated",
    updatedAddress.recipient_name,
    updatedRecipientName,
  );
  TestValidator.equals(
    "line1 should be updated",
    updatedAddress.line1,
    updatedLine1,
  );
  TestValidator.equals(
    "line2 should be updated",
    updatedAddress.line2,
    updatedLine2,
  );
  TestValidator.equals(
    "city should be updated",
    updatedAddress.city,
    updatedCity,
  );
  TestValidator.equals(
    "postal_code should be updated",
    updatedAddress.postal_code,
    updatedPostalCode,
  );
  TestValidator.equals(
    "phone_number should be updated",
    updatedAddress.phone_number,
    updatedPhoneNumber,
  );
  TestValidator.equals(
    "is_default should be toggled to new value",
    updatedAddress.is_default,
    updatedIsDefault,
  );

  // Timestamp semantics
  TestValidator.equals(
    "created_at should remain unchanged after update",
    updatedAddress.created_at,
    originalAddress.created_at,
  );
  TestValidator.notEquals(
    "updated_at should change after address update",
    updatedAddress.updated_at,
    originalAddress.updated_at,
  );
}
