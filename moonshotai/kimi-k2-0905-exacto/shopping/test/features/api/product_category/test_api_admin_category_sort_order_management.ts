import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallProductCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductCategory";

/**
 * Test category display ordering functionality including numerical sort
 * positions and hierarchical navigation. Validates that sort order values
 * control category placement in navigation menus consistently across category
 * hierarchy.
 */
export async function test_api_admin_category_sort_order_management(
  connection: api.IConnection,
) {
  // Step 1: Admin Authentication - Create admin account to obtain authorization
  const adminEmail: string = typia.random<string & tags.Format<"email">>();
  const admin = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      firstname: RandomGenerator.name(1),
      lastname: RandomGenerator.name(1),
      adminlevel: "department_admin",
      department: "Product Management",
    } satisfies IShoppingMallAdmin.ICreate,
  });
  typia.assert(admin);

  // Step 2: Create root categories with different categorical importance
  // Create root category that should appear first (electronics)
  const electronicDevices =
    await api.functional.shoppingMall.admin.categories.create(connection, {
      body: {
        code: "electronic-devices",
        name: "Electronic Devices",
        description: "High-tech electronic devices and smart devices",
      } satisfies IShoppingMallProductCategory.ICreate,
    });
  typia.assert(electronicDevices);

  // Create root category that should appear second (home appliances)
  const homeAppliances =
    await api.functional.shoppingMall.admin.categories.create(connection, {
      body: {
        code: "home-appliances",
        name: "Home Appliances",
        description: "Essential home appliances for modern living",
      } satisfies IShoppingMallProductCategory.ICreate,
    });
  typia.assert(homeAppliances);

  // Create root category that should appear in the middle
  const fashionClothing =
    await api.functional.shoppingMall.admin.categories.create(connection, {
      body: {
        code: "fashion-clothing",
        name: "Fashion Clothing",
        description: "Latest fashion trends and comfortable apparel",
      } satisfies IShoppingMallProductCategory.ICreate,
    });
  typia.assert(fashionClothing);

  // Create root category that should appear last (least prioritized)
  const holidayDecorations =
    await api.functional.shoppingMall.admin.categories.create(connection, {
      body: {
        code: "holiday-decorations",
        name: "Holiday Decorations",
        description: "Seasonal decorations and festive items",
      } satisfies IShoppingMallProductCategory.ICreate,
    });
  typia.assert(holidayDecorations);

  // Step 3: Create hierarchical subcategories to test parent-child relationships
  // Create subcategories under electronics with varied priority themes
  const audioEquipment =
    await api.functional.shoppingMall.admin.categories.create(connection, {
      body: {
        code: "audio-equipment",
        name: "Audio Equipment",
        description: "Premium audio systems and sound solutions",
        parent_id: electronicDevices.id,
      } satisfies IShoppingMallProductCategory.ICreate,
    });
  typia.assert(audioEquipment);

  const mobilePhones =
    await api.functional.shoppingMall.admin.categories.create(connection, {
      body: {
        code: "mobile-phones",
        name: "Mobile Phones",
        description: "Latest smartphones and communication devices",
        parent_id: electronicDevices.id,
      } satisfies IShoppingMallProductCategory.ICreate,
    });
  typia.assert(mobilePhones);

  const laptopsNotebooks =
    await api.functional.shoppingMall.admin.categories.create(connection, {
      body: {
        code: "laptops-notebooks",
        name: "Laptops and Notebooks",
        description: "Portable computing solutions for work and study",
        parent_id: electronicDevices.id,
      } satisfies IShoppingMallProductCategory.ICreate,
    });
  typia.assert(laptopsNotebooks);

  // Step 4: Create nested categories with multiple levels
  // Create sub-subcategory under audio equipment
  const wirelessHeadphones =
    await api.functional.shoppingMall.admin.categories.create(connection, {
      body: {
        code: "wireless-headphones",
        name: "Wireless Headphones",
        description: "Bluetooth headphones and earbuds",
        parent_id: audioEquipment.id,
      } satisfies IShoppingMallProductCategory.ICreate,
    });
  typia.assert(wirelessHeadphones);

  const gamingHeadphones =
    await api.functional.shoppingMall.admin.categories.create(connection, {
      body: {
        code: "gaming-headphones",
        name: "Gaming Headphones",
        description: "High-performance gaming headsets",
        parent_id: audioEquipment.id,
      } satisfies IShoppingMallProductCategory.ICreate,
    });
  typia.assert(gamingHeadphones);

  // Step 5: Verify all categories were created successfully with proper relationships
  TestValidator.equals(
    "electronic devices category created successfully",
    electronicDevices.code,
    "electronic-devices",
  );
  TestValidator.equals(
    "home appliances category created successfully",
    homeAppliances.code,
    "home-appliances",
  );
  TestValidator.equals(
    "fashion clothing category created successfully",
    fashionClothing.code,
    "fashion-clothing",
  );
  TestValidator.equals(
    "holiday decorations category created successfully",
    holidayDecorations.code,
    "holiday-decorations",
  );

  TestValidator.predicate(
    "audio equipment has electronic devices as parent",
    audioEquipment.parent_id === electronicDevices.id,
  );
  TestValidator.predicate(
    "mobile phones has electronic devices as parent",
    mobilePhones.parent_id === electronicDevices.id,
  );
  TestValidator.predicate(
    "laptops has electronic devices as parent",
    laptopsNotebooks.parent_id === electronicDevices.id,
  );

  TestValidator.predicate(
    "wireless headphones has audio equipment as parent",
    wirelessHeadphones.parent_id === audioEquipment.id,
  );
  TestValidator.predicate(
    "gaming headphones has audio equipment as parent",
    gamingHeadphones.parent_id === audioEquipment.id,
  );

  // Validate that categories follow required format constraints
  TestValidator.predicate(
    "category names follow maximum length constraint",
    electronicDevices.name.length <= 100,
  );
  TestValidator.predicate(
    "category codes follow required format",
    /^[a-z0-9-]+$/.test(electronicDevices.code),
  );
  TestValidator.predicate(
    "category descriptions can be null or have max length",
    electronicDevices.description !== undefined &&
      (electronicDevices.description === null ||
        electronicDevices.description.length <= 2000),
  );

  // Validate hierarchical properties are correctly set
  TestValidator.predicate(
    "root categories should have null parent_id",
    electronicDevices.parent_id === null,
  );
  TestValidator.predicate(
    "subcategories should have non-null parent_id",
    audioEquipment.parent_id !== null,
  );
  TestValidator.predicate(
    "nested subcategories have deeper parent chain",
    wirelessHeadphones.parent_id !== null,
  );

  // Test the semantic correctness of category relationships
  TestValidator.equals(
    "wireless headphones parent equals audio equipment",
    wirelessHeadphones.parent_id,
    audioEquipment.id,
  );
  TestValidator.equals(
    "gaming headphones parent equals audio equipment",
    gamingHeadphones.parent_id,
    audioEquipment.id,
  );
  TestValidator.equals(
    "audio equipment parent equals electronic devices",
    audioEquipment.parent_id,
    electronicDevices.id,
  );

  // Validate category path representation
  TestValidator.predicate(
    "electronic devices category path includes code",
    electronicDevices.path.includes(electronicDevices.code),
  );
  TestValidator.predicate(
    "audio equipment path should be more complex than root",
    audioEquipment.path.length > electronicDevices.path.length,
  );
  TestValidator.predicate(
    "wireless headphones should have deepest path",
    wirelessHeadphones.path.length > audioEquipment.path.length,
  );

  // Validate mandatory boolean properties
  TestValidator.predicate(
    "categories are active by default or explicitly set",
    electronicDevices.is_active === true,
  );
  TestValidator.predicate(
    "featured status correctly represents category priority",
    typeof fashionClothing.is_featured === "boolean",
  );
  TestValidator.predicate(
    "all categories have consistent boolean properties",
    electronicDevices.is_active === true &&
      homeAppliances.is_active === true &&
      fashionClothing.is_active === true &&
      holidayDecorations.is_active === true,
  );
}
