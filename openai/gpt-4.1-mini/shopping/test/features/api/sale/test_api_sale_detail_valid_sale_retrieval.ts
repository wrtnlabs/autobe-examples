import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallProductCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductCategory";
import type { IShoppingMallSale } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSale";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_sale_detail_valid_sale_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // No authorization required as per specification.
  // To obtain a valid saleId for testing, preknown saleId should be used.
  // Since no creation/list APIs provided, use a hypothetical existing saleId.
  // In real test environment, replace this with a valid saleId from DB or fixture.
  const saleId = "00000000-0000-4000-8000-000000000000"; // Replace with real existing saleId
  // Call the API functional method directly
  const sale = await api.functional.shoppingMall.sales.at(connection, {
    saleId,
  });
  // Validate complete type of the sale object.
  typia.assert(sale);
  // Check specific fields exist and types are as expected.
  TestValidator.predicate(
    "sale id is a valid uuid",
    typeof sale.id === "string" &&
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(
        sale.id,
      ),
  );
  TestValidator.predicate(
    "sale name is non-empty string",
    typeof sale.name === "string" && sale.name.length > 0,
  );
  TestValidator.predicate(
    "sale description is string",
    typeof sale.description === "string",
  );
  TestValidator.predicate(
    "sale basePrice is number",
    typeof sale.basePrice === "number" && sale.basePrice >= 0,
  );
  TestValidator.predicate(
    "sale status is string",
    typeof sale.status === "string",
  );
  TestValidator.predicate(
    "sale createdAt is valid date string",
    typeof sale.createdAt === "string" &&
      !Number.isNaN(Date.parse(sale.createdAt)),
  );
  TestValidator.predicate(
    "sale updatedAt is valid date string",
    typeof sale.updatedAt === "string" &&
      !Number.isNaN(Date.parse(sale.updatedAt)),
  );
  // deletedAt can be string or null
  TestValidator.predicate(
    "sale deletedAt is string or null",
    typeof sale.deletedAt === "string" || sale.deletedAt === null,
  );
  if (typeof sale.deletedAt === "string") {
    TestValidator.predicate(
      "sale deletedAt valid date string",
      !Number.isNaN(Date.parse(sale.deletedAt)),
    );
  }
  // Seller summary checks
  const seller = sale.seller;
  typia.assert(seller);
  TestValidator.predicate(
    "seller id is valid uuid",
    typeof seller.id === "string" &&
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(
        seller.id,
      ),
  );
  TestValidator.predicate(
    "seller email is string",
    typeof seller.email === "string" && seller.email.length > 0,
  );
  TestValidator.predicate(
    "seller shopName is string",
    typeof seller.shopName === "string" && seller.shopName.length > 0,
  );
  TestValidator.predicate(
    "seller approvalStatus is string",
    typeof seller.approvalStatus === "string",
  );
  // rejectionReason and optional fields
  TestValidator.predicate(
    "seller rejectionReason is string or null or undefined",
    seller.rejectionReason === null ||
      seller.rejectionReason === undefined ||
      typeof seller.rejectionReason === "string",
  );
  TestValidator.predicate(
    "seller shopDescription is string or null or undefined",
    seller.shopDescription === null ||
      seller.shopDescription === undefined ||
      typeof seller.shopDescription === "string",
  );
  TestValidator.predicate(
    "seller logoUri is string or null or undefined",
    seller.logoUri === null ||
      seller.logoUri === undefined ||
      typeof seller.logoUri === "string",
  );
  // Category summary checks
  const category = sale.category;
  typia.assert(category);
  TestValidator.predicate(
    "category id is valid uuid",
    typeof category.id === "string" &&
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(
        category.id,
      ),
  );
  TestValidator.predicate(
    "category name is string",
    typeof category.name === "string" && category.name.length > 0,
  );
  TestValidator.predicate(
    "category description is string",
    typeof category.description === "string",
  );
  TestValidator.predicate(
    "category created_at is valid date string",
    typeof category.created_at === "string" &&
      !Number.isNaN(Date.parse(category.created_at)),
  );
  TestValidator.predicate(
    "category updated_at is valid date string",
    typeof category.updated_at === "string" &&
      !Number.isNaN(Date.parse(category.updated_at)),
  );
  TestValidator.predicate(
    "category deleted_at is string or null",
    typeof category.deleted_at === "string" || category.deleted_at === null,
  );
  if (typeof category.deleted_at === "string") {
    TestValidator.predicate(
      "category deleted_at valid date string",
      !Number.isNaN(Date.parse(category.deleted_at)),
    );
  }
}
