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

export async function test_api_customer_address_creation_basic_success(
  connection: api.IConnection,
) {
  // 1. Admin joins and becomes authenticated
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    // Let the server derive IP; keep it undefined here
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallAdminJoin.ICreate;

  const adminAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);

  // 2. Create an active country as admin
  const countryCreateBody = {
    country_code: "KR",
    name_en: "Korea, Republic of",
    phone_code: "+82",
    is_active: true,
    sort_order: typia.random<number & tags.Type<"int32"> & tags.Minimum<0>>(),
  } satisfies IShoppingMallCountry.ICreate;

  const createdCountry: IShoppingMallCountry =
    await api.functional.shoppingMall.admin.countries.create(connection, {
      body: countryCreateBody,
    });
  typia.assert(createdCountry);

  // 3. Customer joins and becomes authenticated
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

  // 4. Create a minimal customer shipping address as this customer
  const recipientName = RandomGenerator.name(2);
  const line1 = RandomGenerator.paragraph({ sentences: 2 });
  const city = RandomGenerator.name(1);
  const postalCode = RandomGenerator.alphabets(5);

  const addressCreateBody = {
    shopping_mall_country_id: createdCountry.id,
    recipient_name: recipientName,
    line1,
    line2: null,
    city,
    postal_code: postalCode,
    phone_number: null,
    // is_default omitted to let the backend apply default behavior
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

  // 5. Business validations
  TestValidator.equals(
    "owner id matches customer id",
    createdAddress.shopping_mall_customer_id,
    customerId,
  );

  TestValidator.equals(
    "country id matches created country",
    createdAddress.shopping_mall_country_id,
    createdCountry.id,
  );

  TestValidator.equals(
    "recipient_name is persisted",
    createdAddress.recipient_name,
    recipientName,
  );

  TestValidator.equals("line1 is persisted", createdAddress.line1, line1);

  TestValidator.equals("city is persisted", createdAddress.city, city);

  TestValidator.equals(
    "postal_code is persisted",
    createdAddress.postal_code,
    postalCode,
  );

  TestValidator.equals("line2 is null by design", createdAddress.line2, null);

  TestValidator.equals(
    "phone_number is null by design",
    createdAddress.phone_number,
    null,
  );

  // is_default: only require that it is a boolean, not its specific value
  TestValidator.predicate(
    "is_default is a boolean",
    typeof createdAddress.is_default === "boolean",
  );

  TestValidator.predicate(
    "created_at is a non-empty string",
    createdAddress.created_at.length > 0,
  );

  TestValidator.predicate(
    "updated_at is a non-empty string",
    createdAddress.updated_at.length > 0,
  );

  TestValidator.equals(
    "deleted_at is null for active address",
    createdAddress.deleted_at,
    null,
  );
}
