import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallCategory";
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

export async function test_api_admin_viewing_deleted_categories(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as administrator
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.MinLength<1> & tags.MaxLength<255> & tags.Format<"email">>(),
      password: typia.random<string & tags.MinLength<8> & tags.MaxLength<128>>(),
    } satisfies IEcommerceMallAdmin.IJoin,
  });
  typia.assert(adminAuth);
  // 2. Create a category that will be deleted for testing
  const category = await generate_random_ecommerce_mall_admin_categories_create(
    adminConnection,
    {
      body: {
        name: RandomGenerator.name(),
        description: RandomGenerator.paragraph({ sentences: 2 }),
      } satisfies IEcommerceMallCategory.ICreate,
    },
  );
  typia.assert(category);
  TestValidator.equals("category created", category.deleted_at, null);
  // 3. Delete the category to test deleted category visibility
  await api.functional.ecommerceMall.admin.categories.erase(adminConnection, {
    categoryId: category.id,
  });
  // 4. Query with showDeleted=true - deleted category should appear
  const withDeleted: IPageIEcommerceMallCategory.ISummary =
    await api.functional.ecommerceMall.categories.index(adminConnection, {
      body: {
        showDeleted: true,
        limit: 100,
      } satisfies IEcommerceMallCategory.IRequest,
    });
  typia.assert(withDeleted);
  const deletedCategory = withDeleted.data.find((c) => c.id === category.id);
  TestValidator.predicate(
    "deleted category appears with showDeleted=true",
    deletedCategory !== undefined,
  );
  TestValidator.predicate(
    "deleted category has non-null deleted_at",
    deletedCategory !== undefined && deletedCategory.deleted_at !== null,
  );
  // 5. Query with showDeleted=false - deleted category should NOT appear
  const withoutDeleted: IPageIEcommerceMallCategory.ISummary =
    await api.functional.ecommerceMall.categories.index(adminConnection, {
      body: {
        showDeleted: false,
        limit: 100,
      } satisfies IEcommerceMallCategory.IRequest,
    });
  typia.assert(withoutDeleted);
  const notFound = withoutDeleted.data.find((c) => c.id === category.id);
  TestValidator.predicate(
    "deleted category excluded with showDeleted=false",
    notFound === undefined,
  );
  // 6. Query without showDeleted parameter - deleted category should NOT appear
  const defaultFilter: IPageIEcommerceMallCategory.ISummary =
    await api.functional.ecommerceMall.categories.index(adminConnection, {
      body: {
        limit: 100,
      } satisfies IEcommerceMallCategory.IRequest,
    });
  typia.assert(defaultFilter);
  const notFoundDefault = defaultFilter.data.find((c) => c.id === category.id);
  TestValidator.predicate(
    "deleted category excluded without showDeleted parameter",
    notFoundDefault === undefined,
  );
}