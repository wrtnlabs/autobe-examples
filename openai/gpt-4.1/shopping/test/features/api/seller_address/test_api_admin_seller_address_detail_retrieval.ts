import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingAdmin";
import type { IShoppingAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingAuthorizationToken";
import type { IShoppingSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingSeller";
import type { IShoppingSellerAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingSellerAddress";

export async function test_api_admin_seller_address_detail_retrieval(
  connection: api.IConnection,
) {
  // 1. Register an admin account
  const adminJoin = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(10) + "A!1",
    name: RandomGenerator.name(),
    role: "super",
    status: "active",
  } satisfies IShoppingAdmin.IJoin;
  const admin: IShoppingAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, { body: adminJoin });
  typia.assert(admin);

  // 2. Register a seller account
  const sellerJoin = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(9) + "X?3",
    display_name: RandomGenerator.name(2),
    contact_phone: RandomGenerator.mobile(),
    status: "pending",
  } satisfies IShoppingSeller.IJoin;
  const seller: IShoppingSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, { body: sellerJoin });
  typia.assert(seller);

  // 3. Register an address for the seller
  const createAddressBody = {
    address_line1: RandomGenerator.paragraph({ sentences: 2 }),
    address_line2: RandomGenerator.paragraph({ sentences: 1 }),
    city: RandomGenerator.paragraph({ sentences: 1 }),
    state: RandomGenerator.paragraph({ sentences: 1 }),
    postal_code: RandomGenerator.alphaNumeric(7),
    country: "South Korea",
    is_primary: true,
    is_return_address: false,
    phone: RandomGenerator.mobile(),
    recipient_name: RandomGenerator.name(1),
  } satisfies IShoppingSellerAddress.ICreate;
  const address: IShoppingSellerAddress =
    await api.functional.shopping.seller.sellers.addresses.create(connection, {
      sellerId: seller.id,
      body: createAddressBody,
    });
  typia.assert(address);

  // 4. Admin retrieves the address details
  const read: IShoppingSellerAddress =
    await api.functional.shopping.admin.sellers.addresses.at(connection, {
      sellerId: seller.id,
      addressId: address.id,
    });
  typia.assert(read);
  TestValidator.equals(
    "all address details should exactly match registered values",
    read.address_line1,
    address.address_line1,
  );
  TestValidator.equals(
    "address_line2 matches",
    read.address_line2,
    address.address_line2,
  );
  TestValidator.equals("city matches", read.city, address.city);
  TestValidator.equals("state matches", read.state, address.state);
  TestValidator.equals(
    "postal_code matches",
    read.postal_code,
    address.postal_code,
  );
  TestValidator.equals("country matches", read.country, address.country);
  TestValidator.equals(
    "is_primary flag matches",
    read.is_primary,
    address.is_primary,
  );
  TestValidator.equals(
    "is_return_address flag matches",
    read.is_return_address,
    address.is_return_address,
  );
  TestValidator.equals("phone matches", read.phone, address.phone);
  TestValidator.equals(
    "recipient_name matches",
    read.recipient_name,
    address.recipient_name,
  );
  TestValidator.equals(
    "shopping_seller_id matches",
    read.shopping_seller_id,
    seller.id,
  );
  TestValidator.equals("id matches", read.id, address.id);

  // 5. Error checks - addressId not found for seller
  const badSellerId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error("should fail for non-existent seller", async () => {
    await api.functional.shopping.admin.sellers.addresses.at(connection, {
      sellerId: badSellerId,
      addressId: address.id,
    });
  });

  const badAddressId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error(
    "should fail for non-existent address under valid seller",
    async () => {
      await api.functional.shopping.admin.sellers.addresses.at(connection, {
        sellerId: seller.id,
        addressId: badAddressId,
      });
    },
  );

  const wrongOwner = await api.functional.auth.seller.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(7) + "bC3",
      display_name: RandomGenerator.name(2),
      contact_phone: RandomGenerator.mobile(),
      status: "pending",
    } satisfies IShoppingSeller.IJoin,
  });
  typia.assert(wrongOwner);
  await TestValidator.error(
    "should fail for mismatch between sellerId and addressId",
    async () => {
      await api.functional.shopping.admin.sellers.addresses.at(connection, {
        sellerId: wrongOwner.id,
        addressId: address.id,
      });
    },
  );

  // 6. (Skipped) Soft-deleted address is not returned by default – no API to soft-delete, so cannot simulate directly.
}
