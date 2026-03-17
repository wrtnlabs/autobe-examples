import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
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

export async function test_api_category_admin_update_name_description(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin authentication via join
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  // 2. Create test category using utility function
  const category = await generate_random_ecommerce_mall_admin_categories_create(
    adminConnection,
    {
      body: {
        name: "Electronics",
        description: "Electronic devices and gadgets",
      } satisfies IEcommerceMallCategory.ICreate,
    },
  );
  typia.assert(category);
  // 3. Update category name and description
  const updated = await api.functional.ecommerceMall.admin.categories.update(
    adminConnection,
    {
      categoryId: category.id,
      body: {
        name: "Electronic Devices",
        description: "Modern electronic gadgets and computers",
      } satisfies IEcommerceMallCategory.IUpdate,
    },
  );
  typia.assert(updated);
  // 4. Verify update
  TestValidator.equals("name updated", updated.name, "Electronic Devices");
  TestValidator.equals(
    "description updated",
    updated.description,
    "Modern electronic gadgets and computers",
  );
  TestValidator.equals("id unchanged", updated.id, category.id);
  TestValidator.equals("parent is null", updated.parent, null);
  TestValidator.predicate(
    "updated_at is after created_at",
    new Date(updated.updated_at) > new Date(category.created_at),
  );
  TestValidator.equals("deleted_at is null", updated.deleted_at, null);
}
