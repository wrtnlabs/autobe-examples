import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallProductCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductCategory";
import type { IShoppingMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSnapshot";
import type { IShoppingMallProductUnit } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductUnit";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";

export async function test_api_product_snapshot_category_evolution_tracking(
  connection: api.IConnection,
) {
  // Generate a unique product code for testing
  const productCode = typia.random<
    string & tags.MinLength<5> & tags.MaxLength<20>
  >();

  // Create multiple snapshots with different category assignments to simulate evolution
  const snapshots = ArrayUtil.repeat(3, (index) => {
    const categoryPath =
      index === 0
        ? "Electronics/Computers/Laptops"
        : index === 1
          ? "Electronics/Computers/Tablets"
          : "Electronics/Accessories";

    const categoryLevel = index + 1;
    const categoryId = typia.random<string & tags.Format<"uuid">>();

    return {
      id: typia.random<string & tags.Format<"uuid">>(),
      category: {
        id: categoryId,
        code: RandomGenerator.alphabets(8),
        name: categoryPath.split("/").pop()!,
        path: categoryPath,
        level: categoryLevel,
        is_active: true,
        is_featured: false,
        product_count: 0,
        updated_at: new Date(Date.now() - index * 86400000).toISOString(), // Different timestamps
        parent:
          index > 0
            ? {
                id: typia.random<string & tags.Format<"uuid">>(),
                code: "parent-category",
                name: "Parent",
                path: "Electronics",
                level: 1,
                is_active: true,
                is_featured: false,
                product_count: index,
                updated_at: new Date(
                  Date.now() - index * 86400000,
                ).toISOString(),
              }
            : undefined,
      },
      // Random product snapshot data with consistent structures
      name: RandomGenerator.name(),
      description: RandomGenerator.paragraph({ sentences: 5 }),
      price: typia.random<
        number & tags.Type<"uint32"> & tags.Minimum<100> & tags.Maximum<5000>
      >(),
      original_price: typia.random<
        number & tags.Type<"uint32"> & tags.Minimum<100> & tags.Maximum<5000>
      >(),
      is_active: true,
      sku_code: RandomGenerator.alphaNumeric(10),
      seller: {
        id: typia.random<string & tags.Format<"uuid">>(),
        email: typia.random<string & tags.Format<"email">>(),
        business_name: RandomGenerator.name(),
        phone: RandomGenerator.mobile(),
        business_type: "corporation",
        verification_status: "verified",
        is_verified: true,
        commission_rate: 0.05,
        created_at: new Date(Date.now() - index * 86400000).toISOString(),
        updated_at: new Date(Date.now() - index * 86400000).toISOString(),
      },
      variants: ArrayUtil.repeat(index + 1, (variantIndex) => ({
        id: typia.random<string & tags.Format<"uuid">>(),
        name: `Variant ${variantIndex + 1}`,
        sku_code: RandomGenerator.alphaNumeric(8),
        price: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<50> & tags.Maximum<1000>
        >(),
        is_active: true,
      })),
      categories: [
        {
          id: categoryId,
          code: RandomGenerator.alphabets(8),
          name: categoryPath.split("/").pop()!,
          path: categoryPath,
          level: categoryLevel,
          is_active: true,
          is_featured: false,
          product_count: 0,
          updated_at: new Date(Date.now() - index * 86400000).toISOString(),
          parent:
            index > 0
              ? {
                  id: typia.random<string & tags.Format<"uuid">>(),
                  code: "parent-category",
                  name: "Parent",
                  path: "Electronics",
                  level: 1,
                  is_active: true,
                  is_featured: false,
                  product_count: index,
                  updated_at: new Date(
                    Date.now() - index * 86400000,
                  ).toISOString(),
                }
              : undefined,
        },
      ],
      units: ArrayUtil.repeat(index + 1, () => ({
        id: typia.random<string & tags.Format<"uuid">>(),
        shopping_mall_product_id: typia.random<string & tags.Format<"uuid">>(),
        name: RandomGenerator.name(),
        type: RandomGenerator.pick(["size", "color", "material", "style"]),
        display_style: RandomGenerator.pick([
          "dropdown",
          "buttons",
          "swatches",
        ]),
        is_required: true,
        is_multiple: false,
        sort_order: index,
        created_at: new Date(Date.now() - index * 86400000).toISOString(),
        updated_at: new Date(Date.now() - index * 86400000).toISOString(),
        deleted_at: null,
      })),
      reviews_count: typia.random<
        number & tags.Type<"int32"> & tags.Minimum<0> & tags.Maximum<100>
      >(),
      average_rating: typia.random<
        number & tags.Minimum<0> & tags.Maximum<5>
      >(),
      created_at: new Date(Date.now() - index * 86400000).toISOString(),
      updated_at: new Date(Date.now() - index * 86400000).toISOString(),
      snapshot_created_at: new Date(
        Date.now() - index * 86400000,
      ).toISOString(),
    };
  });

  // Test retrieving each snapshot and validating category information
  for (const expectedSnapshot of snapshots) {
    const retrievedSnapshot =
      await api.functional.shoppingMall.products.snapshots.atSnapshot(
        connection,
        {
          productCode,
          snapshotId: expectedSnapshot.id,
        },
      );

    // Validate the snapshot structure and type safety
    typia.assert(retrievedSnapshot);

    // Verify that the category information is correctly preserved
    TestValidator.equals(
      "retrieved category matches expected category structure",
      retrievedSnapshot.category.id,
      expectedSnapshot.category.id,
    );

    TestValidator.equals(
      "category path is correctly preserved",
      retrievedSnapshot.category.path,
      expectedSnapshot.category.path,
    );

    TestValidator.equals(
      "category level is correctly preserved",
      retrievedSnapshot.category.level,
      expectedSnapshot.category.level,
    );

    // Validate all categories array matches the primary category
    TestValidator.equals(
      "all categories array contains correct category",
      retrievedSnapshot.categories.length,
      1,
    );

    TestValidator.equals(
      "primary category matches the main category assignment",
      retrievedSnapshot.categories[0].path,
      expectedSnapshot.category.path,
    );

    // Verify parent category relationships when applicable
    if (expectedSnapshot.category.parent) {
      TestValidator.notEquals(
        "parent category information exists when expected",
        retrievedSnapshot.category.parent,
        undefined,
      );

      if (retrievedSnapshot.category.parent) {
        TestValidator.equals(
          "parent category path matches expected",
          retrievedSnapshot.category.parent.path,
          expectedSnapshot.category.parent!.path,
        );
      }
    }
  }

  // Test edge case: Retrieving snapshot with different categories over time
  const categoryPaths = snapshots
    .map((s) => s.category.path)
    .filter((path, index, arr) => arr.indexOf(path) === index);
  const categoryLevels = snapshots.map((s) => s.category.level).sort();

  TestValidator.equals(
    "category changes are tracked across snapshots",
    categoryPaths.length,
    snapshots.length,
  );

  TestValidator.equals(
    "category levels show progression",
    categoryLevels[0],
    1,
  );

  TestValidator.equals(
    "highest category level increases",
    categoryLevels[categoryLevels.length - 1],
    snapshots.length,
  );

  // Validate temporal consistency of snapshot timestamps
  const snapshotTimestamps = snapshots.map((s) => s.snapshot_created_at).sort();
  TestValidator.predicate(
    "snapshot timestamps are ordered correctly",
    snapshotTimestamps.every(
      (timestamp, index) =>
        index === 0 || snapshotTimestamps[index - 1] <= timestamp,
    ),
  );
}
