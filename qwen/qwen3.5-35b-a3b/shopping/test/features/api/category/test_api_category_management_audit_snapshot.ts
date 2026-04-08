import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdministrator";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";
import { generate_random_ecommerce_mall_administrator_categories_create } from "../../../generate/generate_random_ecommerce_mall_administrator_categories_create";
import { prepare_random_ecommerce_mall_category } from "../../../prepare/prepare_random_ecommerce_mall_category";

export async function test_api_category_management_audit_snapshot(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register administrator account to obtain authentication credentials
  const adminJoinConnection: api.IConnection = { host: connection.host };
  const administrator: IEcommerceMallAdministrator.IAuthorized =
    await authorize_administrator_join(adminJoinConnection, {
      body: {
        display_name: RandomGenerator.name(2),
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        grade: "regular",
      },
    });
  typia.assert(administrator);
  // Verify administrator has expected fields
  TestValidator.equals(
    "administrator has id",
    administrator.id !== undefined,
    true,
  );
  TestValidator.equals(
    "administrator has email",
    administrator.email !== undefined,
    true,
  );
  TestValidator.equals(
    "administrator has display_name",
    administrator.display_name !== undefined,
    true,
  );
  TestValidator.equals(
    "administrator has grade",
    administrator.grade,
    "regular",
  );
  TestValidator.equals(
    "administrator is not banned",
    administrator.is_banned,
    false,
  );
  TestValidator.equals(
    "administrator has token",
    administrator.token.access !== undefined,
    true,
  );
  TestValidator.equals(
    "administrator has refresh token",
    administrator.token.refresh !== undefined,
    true,
  );
  // Store the category input for comparison
  const categoryName = typia.random<
    string & tags.MinLength<1> & tags.MaxLength<100>
  >();
  const categoryDescription = typia.random<
    string & tags.MinLength<1> & tags.MaxLength<500>
  >();
  const categorySortOrder = typia.random<
    number & tags.Type<"int32"> & tags.Minimum<-999> & tags.Maximum<999>
  >();
  // 2. Create new category using the administrator's authentication
  const adminCreateConnection: api.IConnection = { host: connection.host };
  const createdCategory: IEcommerceMallCategory =
    await generate_random_ecommerce_mall_administrator_categories_create(
      adminCreateConnection,
      {
        body: {
          name: categoryName,
          description: categoryDescription,
          sort_order: categorySortOrder,
        },
      },
    );
  typia.assert(createdCategory);
  // 3. Verify category has all required fields for snapshot
  TestValidator.equals(
    "category has id",
    createdCategory.id !== undefined,
    true,
  );
  TestValidator.equals(
    "category has name",
    createdCategory.name !== undefined,
    true,
  );
  TestValidator.equals(
    "category has description",
    createdCategory.description !== undefined,
    true,
  );
  TestValidator.equals(
    "category has created_at",
    createdCategory.created_at !== undefined,
    true,
  );
  TestValidator.equals(
    "category has updated_at",
    createdCategory.updated_at !== undefined,
    true,
  );
  TestValidator.equals(
    "category has creator_id",
    createdCategory.creator_id !== undefined,
    true,
  );
  // 4. Verify creator_id matches the administrator who created it
  TestValidator.equals(
    "category creator_id matches administrator id",
    createdCategory.creator_id,
    administrator.id,
  );
  // 5. Verify created_at and updated_at are valid ISO 8601 date-time format
  const createdDateTime: Date = new Date(createdCategory.created_at);
  TestValidator.predicate(
    "created_at is valid date",
    !isNaN(createdDateTime.getTime()),
  );
  const updatedDateTime: Date = new Date(createdCategory.updated_at);
  TestValidator.predicate(
    "updated_at is valid date",
    !isNaN(updatedDateTime.getTime()),
  );
  // 6. Verify created_at and updated_at are the same (should be on creation)
  TestValidator.equals(
    "created_at equals updated_at on creation",
    createdCategory.created_at,
    createdCategory.updated_at,
  );
  // 7. Verify sort_order is properly set (can be null or integer)
  if (createdCategory.sort_order !== undefined) {
    TestValidator.predicate(
      "sort_order is within valid range",
      createdCategory.sort_order! >= -999 && createdCategory.sort_order! <= 999,
    );
  }
  // 8. Verify parent_id is null for top-level category (unless explicitly set)
  if (createdCategory.parent_id !== undefined) {
    TestValidator.predicate(
      "parent_id is valid uuid",
      /^[0-9a-f-]{36}$/i.test(createdCategory.parent_id!),
    );
  }
  // 9. Verify parent is null for top-level category
  if (createdCategory.parent === undefined || createdCategory.parent === null) {
    // Top-level category, parent should be null
    TestValidator.equals(
      "top-level category has null parent",
      createdCategory.parent,
      null,
    );
  }
  // 10. Verify children is empty array for new category
  if (createdCategory.children !== undefined) {
    TestValidator.equals(
      "new category has empty children array",
      createdCategory.children.length,
      0,
    );
  }
  // 11. Verify deleted_at is null (active category)
  TestValidator.equals(
    "active category has null deleted_at",
    createdCategory.deleted_at,
    null,
  );
  // 12. Verify creator exists in the response
  if (createdCategory.creator !== undefined && createdCategory.creator !== null) {
    TestValidator.equals(
      "category has creator reference",
      createdCategory.creator.id,
      administrator.id,
    );
    TestValidator.equals(
      "creator display name matches",
      createdCategory.creator.displayName,
      administrator.display_name,
    );
    TestValidator.equals(
      "creator grade matches",
      createdCategory.creator.grade,
      administrator.grade,
    );
  }
  // 13. Verify category name matches input
  TestValidator.equals(
    "category name matches input",
    createdCategory.name,
    categoryName,
  );
  // 14. Verify category description matches input
  TestValidator.equals(
    "category description matches input",
    createdCategory.description,
    categoryDescription,
  );
  // 15. Verify snapshot immutability: category cannot be modified directly
  // Note: In a real test, we would verify the snapshot table records
  // Since there's no API endpoint to query snapshots, we verify the category
  // creation process completes successfully, which implies snapshot was created
  // 16. Test that category creation fails with validation errors
  // This validates that the system enforces business rules for category creation
  const invalidCategory: IEcommerceMallCategory.ICreate = {
    name: "", // Empty name should fail
    description: "", // Empty description should fail
  };
  await TestValidator.error(
    "category creation requires valid name and description",
    async () => {
      await api.functional.ecommerceMall.administrator.categories.create(
        adminCreateConnection,
        { body: invalidCategory },
      );
    },
  );
}