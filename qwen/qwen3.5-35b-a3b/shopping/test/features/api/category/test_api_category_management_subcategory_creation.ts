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

export async function test_api_category_management_subcategory_creation(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register administrator
  const adminConnection: api.IConnection = { host: connection.host };
  const admin: IEcommerceMallAdministrator.IAuthorized =
    await authorize_administrator_join(adminConnection, {
      body: {
        display_name: RandomGenerator.name(2),
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        grade: "regular" as const,
      } satisfies IEcommerceMallAdministrator.IJoin,
    });
  typia.assert(admin);
  // 2. Create top-level category (parent_id: null)
  const topLevelName = RandomGenerator.paragraph({ sentences: 2 });
  const topLevelDescription = RandomGenerator.paragraph({ sentences: 3 });
  const topLevelCategory: IEcommerceMallCategory =
    await api.functional.ecommerceMall.administrator.categories.create(
      adminConnection,
      {
        body: {
          name: topLevelName,
          description: topLevelDescription,
          parent_id: null,
          sort_order: 0,
        } satisfies IEcommerceMallCategory.ICreate,
      },
    );
  typia.assert(topLevelCategory);
  // Validate top-level category properties
  TestValidator.equals(
    "top-level category has no parent",
    topLevelCategory.parent_id,
    null,
  );
  TestValidator.equals(
    "top-level category name matches",
    topLevelCategory.name,
    topLevelName,
  );
  TestValidator.equals(
    "top-level category description matches",
    topLevelCategory.description,
    topLevelDescription,
  );
  TestValidator.predicate(
    "top-level category has valid sort_order",
    topLevelCategory.sort_order === 0,
  );
  TestValidator.predicate(
    "top-level category created_at is valid date-time",
    topLevelCategory.created_at !== undefined,
  );
  TestValidator.predicate(
    "top-level category updated_at is valid date-time",
    topLevelCategory.updated_at !== undefined,
  );
  // 3. Create subcategory (parent_id: referencing topLevelCategory)
  const subcategoryName = RandomGenerator.paragraph({ sentences: 2 });
  const subcategoryDescription = RandomGenerator.paragraph({ sentences: 3 });
  const subcategory: IEcommerceMallCategory =
    await api.functional.ecommerceMall.administrator.categories.create(
      adminConnection,
      {
        body: {
          name: subcategoryName,
          description: subcategoryDescription,
          parent_id: topLevelCategory.id,
          sort_order: 1,
        } satisfies IEcommerceMallCategory.ICreate,
      },
    );
  typia.assert(subcategory);
  // 4. Validate subcategory response
  TestValidator.equals(
    "subcategory parent_id matches topLevel category",
    subcategory.parent_id,
    topLevelCategory.id,
  );
  TestValidator.equals(
    "subcategory name matches input",
    subcategory.name,
    subcategoryName,
  );
  TestValidator.equals(
    "subcategory description matches input",
    subcategory.description,
    subcategoryDescription,
  );
  TestValidator.predicate(
    "subcategory has valid sort_order",
    subcategory.sort_order === 1,
  );
  TestValidator.predicate(
    "subcategory created_at is valid date-time",
    subcategory.created_at !== undefined,
  );
  TestValidator.predicate(
    "subcategory updated_at is valid date-time",
    subcategory.updated_at !== undefined,
  );
  // 5. Validate parent relationship
  TestValidator.predicate(
    "subcategory has parent reference",
    subcategory.parent !== null,
  );
  TestValidator.equals(
    "parent id matches topLevel id",
    subcategory.parent?.id,
    topLevelCategory.id,
  );
  TestValidator.equals(
    "parent name matches topLevel name",
    subcategory.parent?.name,
    topLevelCategory.name,
  );
  TestValidator.equals(
    "parent description exists",
    subcategory.parent?.description,
    topLevelCategory.description,
  );
  TestValidator.equals(
    "parent created_at exists",
    subcategory.parent?.created_at,
    topLevelCategory.created_at,
  );
  TestValidator.equals(
    "parent updated_at exists",
    subcategory.parent?.updated_at,
    topLevelCategory.updated_at,
  );
  // 6. Validate creator_id is set to the administrator who created it
  TestValidator.equals(
    "subcategory creator_id matches admin id",
    subcategory.creator_id,
    admin.id,
  );
  TestValidator.predicate(
    "subcategory has creator reference",
    subcategory.creator !== null,
  );
  TestValidator.equals(
    "creator id matches admin id",
    subcategory.creator?.id,
    admin.id,
  );
  TestValidator.equals(
    "creator display_name matches admin name",
    subcategory.creator?.displayName,
    admin.display_name,
  );
  TestValidator.equals(
    "creator grade is regular",
    subcategory.creator?.grade,
    "regular",
  );
}
