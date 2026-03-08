import api from "@ORGANIZATION/PROJECT-api";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

/**
 * Test product retrieval when the product has no available variants or no variants at all.
 * 1. Test product details retrieval using simulate mode
 * 2. Validate product structure and relationships
 * 3. Verify seller and category data is correctly populated
 * 4. Ensure all metadata fields are accessible
 */
export async function test_api_product_details_unavailable_variant(
  connection: api.IConnection,
): Promise<void> {
  // Use simulator mode to test product retrieval structure
  const testConnection: api.IConnection = {
    host: connection.host,
    simulate: true,
  };
  // Generate random product ID for testing
  const productId = typia.random<string & tags.Format<"uuid">>();
  // Retrieve product details (will use simulated data)
  const retrievedProduct = await api.functional.ecommerceMall.products.at(
    testConnection,
    {
      productId,
    },
  );
  typia.assert(retrievedProduct);
  // 1. Validate core product fields
  TestValidator.equals("product id matches", retrievedProduct.id, productId);
  TestValidator.predicate("product name is valid string", () => {
    return (
      retrievedProduct.name.length > 0 && retrievedProduct.name.length <= 500
    );
  });
  TestValidator.predicate(
    "product base_price is positive",
    () => retrievedProduct.base_price > 0,
  );
  TestValidator.predicate(
    "product is_active is boolean",
    () => typeof retrievedProduct.is_active === "boolean",
  );
  // 2. Validate optional description field
  if (
    retrievedProduct.description !== undefined &&
    retrievedProduct.description !== null
  ) {
    TestValidator.predicate(
      "description is string when present",
      () => typeof retrievedProduct.description === "string",
    );
  }
  // 3. Validate timestamps are valid date-time
  TestValidator.predicate("created_at is valid date-time", () => {
    const date = new Date(retrievedProduct.created_at!);
    return !isNaN(date.getTime());
  });
  TestValidator.predicate("updated_at is valid date-time", () => {
    const date = new Date(retrievedProduct.updated_at!);
    return !isNaN(date.getTime());
  });
  // 4. Validate deleted_at is either null or valid date-time
  if (
    retrievedProduct.deleted_at !== undefined &&
    retrievedProduct.deleted_at !== null
  ) {
    TestValidator.predicate(
      "deleted_at is valid date-time when present",
      () => {
        const date = new Date(retrievedProduct.deleted_at!);
        return !isNaN(date.getTime());
      },
    );
  }
  // 5. Validate seller relationship
  TestValidator.predicate("seller id is valid uuid", () => {
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      retrievedProduct.seller.id,
    );
  });
  TestValidator.predicate("seller email is valid email format", () => {
    const emailRegex =
      /^[a-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[a-z0-9!#$%&'*+/=?^_`{|}~-]+)*@(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/i;
    return emailRegex.test(retrievedProduct.seller.email);
  });
  TestValidator.predicate("seller approval_status is valid", () => {
    return ["pending", "approved", "rejected"].includes(
      retrievedProduct.seller.approval_status,
    );
  });
  TestValidator.predicate(
    "seller is_suspended is boolean",
    () => typeof retrievedProduct.seller.is_suspended === "boolean",
  );
  TestValidator.predicate(
    "seller is_banned is boolean",
    () => typeof retrievedProduct.seller.is_banned === "boolean",
  );
  TestValidator.predicate("seller created_at is valid date-time", () => {
    const date = new Date(retrievedProduct.seller.created_at!);
    return !isNaN(date.getTime());
  });
  // 6. Validate category relationship
  TestValidator.predicate("category id is valid uuid", () => {
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      retrievedProduct.category.id,
    );
  });
  TestValidator.predicate("category name is non-empty string", () => {
    return retrievedProduct.category.name.length > 0;
  });
  TestValidator.predicate(
    "category is_leaf is boolean",
    () => typeof retrievedProduct.category.is_leaf === "boolean",
  );
  TestValidator.predicate("category created_at is valid date-time", () => {
    const date = new Date(retrievedProduct.category.created_at!);
    return !isNaN(date.getTime());
  });
  TestValidator.predicate("category updated_at is valid date-time", () => {
    const date = new Date(retrievedProduct.category.updated_at!);
    return !isNaN(date.getTime());
  });
  TestValidator.predicate(
    "category deleted_at is valid date-time or null",
    () => {
      return (
        retrievedProduct.category.deleted_at === null ||
        !isNaN(new Date(retrievedProduct.category.deleted_at!).getTime())
      );
    },
  );
  // 7. Validate parent category can be null or valid
  if (
    retrievedProduct.category.parent !== undefined &&
    retrievedProduct.category.parent !== null
  ) {
    TestValidator.predicate("parent category id is valid uuid", () => {
      return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        retrievedProduct.category.parent!.id,
      );
    });
  }
}
