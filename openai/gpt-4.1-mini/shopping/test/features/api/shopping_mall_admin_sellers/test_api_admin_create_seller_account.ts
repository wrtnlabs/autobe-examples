import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";

export async function test_api_admin_create_seller_account(
  connection: api.IConnection,
) {
  // 1. Authenticate as admin
  const adminEmail: string = typia.random<string & tags.Format<"email">>();
  const adminPasswordHash = RandomGenerator.alphaNumeric(32);
  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password_hash: adminPasswordHash,
        full_name: RandomGenerator.name(),
        phone_number: RandomGenerator.mobile(),
        status: "active",
      } satisfies IShoppingMallAdmin.ICreate,
    });
  typia.assert(admin);

  // 2. Create new seller account
  const sellerEmail: string = typia.random<string & tags.Format<"email">>();
  const sellerPasswordHash: string = RandomGenerator.alphaNumeric(32);
  const createSellerBody = {
    email: sellerEmail,
    password_hash: sellerPasswordHash,
    company_name: RandomGenerator.name(),
    contact_name: RandomGenerator.name(),
    phone_number: RandomGenerator.mobile(),
    status: "active",
  } satisfies IShoppingMallSeller.ICreate;

  const seller: IShoppingMallSeller =
    await api.functional.shoppingMall.admin.sellers.create(connection, {
      body: createSellerBody,
    });
  typia.assert(seller);

  // 3. Validate seller account creation fields
  TestValidator.equals(
    "seller email matches",
    seller.email,
    createSellerBody.email,
  );
  TestValidator.predicate(
    "seller id is uuid",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      seller.id,
    ),
  );
  TestValidator.predicate(
    "seller status is active or suspended",
    seller.status === "active" || seller.status === "suspended",
  );
  TestValidator.equals(
    "seller company name matches",
    seller.company_name ?? null,
    createSellerBody.company_name ?? null,
  );
  TestValidator.equals(
    "seller contact name matches",
    seller.contact_name ?? null,
    createSellerBody.contact_name ?? null,
  );
  TestValidator.equals(
    "seller phone number matches",
    seller.phone_number ?? null,
    createSellerBody.phone_number ?? null,
  );
  TestValidator.predicate(
    "seller created_at is valid date",
    !isNaN(Date.parse(seller.created_at)),
  );
  TestValidator.predicate(
    "seller updated_at is valid date",
    !isNaN(Date.parse(seller.updated_at)),
  );
  TestValidator.predicate(
    "seller deleted_at is null or undefined",
    seller.deleted_at === null || seller.deleted_at === undefined,
  );

  // Authorization and uniqueness validation is implicitly handled by the join operation
}
