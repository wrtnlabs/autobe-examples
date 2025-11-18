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

export async function test_api_customer_address_detail_after_update(
  connection: api.IConnection,
) {
  // 1. Admin joins (and gets authenticated) to be allowed to create country/region
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

  // 2. As admin, create a country
  const countryCreateBody = {
    country_code: RandomGenerator.alphaNumeric(3).toUpperCase(),
    name_en: RandomGenerator.paragraph({ sentences: 2 }),
    phone_code: "+" + RandomGenerator.alphaNumeric(2),
    is_active: true,
    sort_order: 1,
  } satisfies IShoppingMallCountry.ICreate;

  const country: IShoppingMallCountry =
    await api.functional.shoppingMall.admin.countries.create(connection, {
      body: countryCreateBody,
    });
  typia.assert(country);

  // 3. As admin, create a region under that country
  const regionCreateBody = {
    code: RandomGenerator.alphaNumeric(5),
    name_en: RandomGenerator.paragraph({ sentences: 2 }),
    region_type: "city",
    is_active: true,
    sort_order: 1,
  } satisfies IShoppingMallRegion.ICreate;

  const region: IShoppingMallRegion =
    await api.functional.shoppingMall.admin.countries.regions.create(
      connection,
      {
        countryCode: country.country_code,
        body: regionCreateBody,
      },
    );
  typia.assert(region);

  // 4. Customer joins (and gets authenticated)
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

  // 5. Customer creates an initial address
  const initialRecipientName = RandomGenerator.name();
  const initialCity = RandomGenerator.name(1);
  const initialLine2 = "Apt " + RandomGenerator.alphaNumeric(3);

  const addressCreateBody = {
    shopping_mall_country_id: country.id,
    shopping_mall_region_id: region.id,
    recipient_name: initialRecipientName,
    line1: RandomGenerator.paragraph({ sentences: 3 }),
    line2: initialLine2,
    city: initialCity,
    postal_code: RandomGenerator.alphaNumeric(6),
    phone_number: RandomGenerator.mobile(),
    is_default: true,
  } satisfies IShoppingMallCustomerAddress.ICreate;

  const createdAddress: IShoppingMallCustomerAddress =
    await api.functional.shoppingMall.customer.customers.addresses.create(
      connection,
      {
        customerId,
        body: addressCreateBody,
      },
    );
  typia.assert(createdAddress);

  // 6. Prepare update payload (change recipient_name, city, line2, and is_default)
  const updatedRecipientName = RandomGenerator.name();
  const updatedCity = RandomGenerator.name(1);
  const updatedLine2 = "Suite " + RandomGenerator.alphaNumeric(3);
  const updatedIsDefault = false;

  const addressUpdateBody = {
    recipient_name: updatedRecipientName,
    city: updatedCity,
    line2: updatedLine2,
    is_default: updatedIsDefault,
  } satisfies IShoppingMallCustomerAddress.IUpdate;

  const updatedAddress: IShoppingMallCustomerAddress =
    await api.functional.shoppingMall.customer.customers.addresses.update(
      connection,
      {
        customerId: customerId as string & tags.Format<"uuid">,
        addressId: createdAddress.id as string & tags.Format<"uuid">,
        body: addressUpdateBody,
      },
    );
  typia.assert(updatedAddress);

  // 7. Immediately fetch the address detail
  const fetchedAddress: IShoppingMallCustomerAddress =
    await api.functional.shoppingMall.customer.customers.addresses.at(
      connection,
      {
        customerId,
        addressId: createdAddress.id,
      },
    );
  typia.assert(fetchedAddress);

  // 8. Validate identity and foreign key stability
  TestValidator.equals(
    "address id remains stable between create and update",
    updatedAddress.id,
    createdAddress.id,
  );
  TestValidator.equals(
    "address id remains stable between update and fetch",
    fetchedAddress.id,
    updatedAddress.id,
  );
  TestValidator.equals(
    "customer id remains stable across records",
    updatedAddress.shopping_mall_customer_id,
    createdAddress.shopping_mall_customer_id,
  );
  TestValidator.equals(
    "customer id in fetched address matches",
    fetchedAddress.shopping_mall_customer_id,
    createdAddress.shopping_mall_customer_id,
  );
  TestValidator.equals(
    "country id remains unchanged",
    updatedAddress.shopping_mall_country_id,
    createdAddress.shopping_mall_country_id,
  );
  TestValidator.equals(
    "country id remains unchanged after fetch",
    fetchedAddress.shopping_mall_country_id,
    createdAddress.shopping_mall_country_id,
  );
  TestValidator.equals(
    "region id remains unchanged",
    updatedAddress.shopping_mall_region_id ?? null,
    createdAddress.shopping_mall_region_id ?? null,
  );
  TestValidator.equals(
    "region id remains unchanged after fetch",
    fetchedAddress.shopping_mall_region_id ?? null,
    createdAddress.shopping_mall_region_id ?? null,
  );

  // 9. Validate mutable fields reflect updates
  TestValidator.equals(
    "recipient_name updated and returned in update response",
    updatedAddress.recipient_name,
    updatedRecipientName,
  );
  TestValidator.equals(
    "recipient_name updated and reflected in fetched detail",
    fetchedAddress.recipient_name,
    updatedRecipientName,
  );
  TestValidator.equals(
    "city updated and returned in update response",
    updatedAddress.city,
    updatedCity,
  );
  TestValidator.equals(
    "city updated and reflected in fetched detail",
    fetchedAddress.city,
    updatedCity,
  );
  TestValidator.equals(
    "line2 updated and returned in update response",
    updatedAddress.line2 ?? null,
    updatedLine2,
  );
  TestValidator.equals(
    "line2 updated and reflected in fetched detail",
    fetchedAddress.line2 ?? null,
    updatedLine2,
  );
  TestValidator.equals(
    "is_default updated in update response",
    updatedAddress.is_default,
    updatedIsDefault,
  );
  TestValidator.equals(
    "is_default updated in fetched detail",
    fetchedAddress.is_default,
    updatedIsDefault,
  );

  // 10. Validate created_at immutability and updated_at advancement
  TestValidator.equals(
    "created_at remains same between create and update",
    updatedAddress.created_at,
    createdAddress.created_at,
  );
  TestValidator.equals(
    "created_at remains same between create and fetch",
    fetchedAddress.created_at,
    createdAddress.created_at,
  );

  // Compare updated_at as ISO strings (lexicographical order works for ISO 8601)
  TestValidator.predicate(
    "updated_at after update is not earlier than created_at",
    updatedAddress.updated_at >= createdAddress.updated_at,
  );
  TestValidator.predicate(
    "fetched updated_at is not earlier than updated response",
    fetchedAddress.updated_at >= updatedAddress.updated_at,
  );
}
