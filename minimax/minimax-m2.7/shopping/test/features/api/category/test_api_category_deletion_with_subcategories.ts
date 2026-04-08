import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
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

export async function test_api_category_deletion_with_subcategories(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as admin
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      actorType: "customer",
      requestedGrade: "admin",
      reason: RandomGenerator.paragraph({ sentences: 5 }),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceMallAdmin.IJoin,
  });
  // 2. Create parent category
  const parentCategory =
    await generate_random_ecommerce_mall_admin_categories_create(
      adminConnection,
      {
        body: {
          name: RandomGenerator.name(),
          description: RandomGenerator.paragraph({ sentences: 2 }),
        },
      },
    );
  typia.assert(parentCategory);
  TestValidator.equals("parent has no parent", parentCategory.parent, null);
  TestValidator.equals(
    "parent has no subcategories initially",
    parentCategory.subcategories.length,
    0,
  );
  // 3. Create subcategories under the parent
  const subcategoryNames = ArrayUtil.repeat(2, () => RandomGenerator.name());
  const subcategories = await ArrayUtil.asyncMap(
    subcategoryNames,
    async (name) => {
      const subcategory =
        await generate_random_ecommerce_mall_admin_categories_create(
          adminConnection,
          {
            body: {
              name,
              parent_id: parentCategory.id,
            },
          },
        );
      return subcategory;
    },
  );
  typia.assert(subcategories);
  // 4. Verify subcategories are properly linked
  for (const subcategory of subcategories) {
    TestValidator.equals(
      "subcategory has parent reference",
      subcategory.parent?.id,
      parentCategory.id,
    );
  }
  // 5. Delete parent category (cascade deletes subcategories)
  await api.functional.ecommerceMall.admin.categories.erase(adminConnection, {
    categoryId: parentCategory.id,
  });
}
