import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallCategory";
import type { IParentReference } from "@ORGANIZATION/PROJECT-api/lib/structures/IParentReference";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { generate_random_ecommerce_mall_admin_categories_create } from "../../../generate/generate_random_ecommerce_mall_admin_categories_create";
import { prepare_random_ecommerce_mall_category } from "../../../prepare/prepare_random_ecommerce_mall_category";

/**
 * Test filtering categories by parentId to retrieve only subcategories belonging to a specific parent category.
 *
 * This test verifies that:
 * 1. A parent category can be created
 * 2. A subcategory can be created under the parent
 * 3. When querying with parentId filter, only direct children of that parent are returned
 * 4. Each result item correctly includes the parent reference with id and name
 */
export async function test_api_category_filter_by_parent(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin authentication
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<
        string & tags.Format<"url">
      >() satisfies string as string,
      referrer: typia.random<
        string & tags.Format<"url">
      >() satisfies string as string,
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IEcommerceMallAdmin.IJoin,
  });
  // 2. Create a parent category
  const parentCategory =
    await generate_random_ecommerce_mall_admin_categories_create(
      adminConnection,
      {
        body: {
          name: RandomGenerator.name(),
          description: RandomGenerator.paragraph({ sentences: 2 }),
          parentId: null,
        } satisfies IEcommerceMallCategory.ICreate,
      },
    );
  typia.assert(parentCategory);
  // 3. Create a subcategory under the parent
  const subCategory =
    await generate_random_ecommerce_mall_admin_categories_create(
      adminConnection,
      {
        body: {
          name: RandomGenerator.name(),
          description: RandomGenerator.paragraph({ sentences: 2 }),
          parentId: parentCategory.id,
        } satisfies IEcommerceMallCategory.ICreate,
      },
    );
  typia.assert(subCategory);
  // 4. Query categories filtered by parentId
  const filteredResult = await api.functional.ecommerceMall.categories.index(
    connection,
    {
      body: {
        parentId: parentCategory.id,
        page: 1,
        limit: 20,
      } satisfies IEcommerceMallCategory.IRequest,
    },
  );
  typia.assert(filteredResult);
  // 5. Validate that only direct children of the specified parent are returned
  TestValidator.equals("filtered result count", filteredResult.data.length, 1);
  TestValidator.equals(
    "subcategory id matches",
    filteredResult.data[0]!.id,
    subCategory.id,
  );
  TestValidator.equals(
    "subcategory name matches",
    filteredResult.data[0]!.name,
    subCategory.name,
  );
  // 6. Verify each result item includes the parent reference with id and name
  TestValidator.predicate(
    "parent reference exists",
    filteredResult.data[0]!.parent !== null,
  );
  TestValidator.equals(
    "parent id matches",
    (filteredResult.data[0]!.parent as IEntity).id,
    parentCategory.id,
  );
}