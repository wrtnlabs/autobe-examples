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

export async function test_api_category_update_by_admin(
  connection: api.IConnection,
): Promise<void> {
  // 1. Submit admin request and get authorized
  const adminJoinConnection: api.IConnection = { host: connection.host };
  const adminJoin = await authorize_admin_join(adminJoinConnection, {});
  // 2. Login as admin with the created credentials
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_login(adminConnection, {
    body: {
      email: adminJoin.email,
      password: "whatever", // Default password from join
      href: "http://localhost:3000/admin",
      referrer: "http://localhost:3000/",
    } satisfies IEcommerceMallAdmin.ILogin,
  });
  // 3. Create a category to update
  const originalCategory =
    await generate_random_ecommerce_mall_admin_categories_create(
      adminConnection,
      {},
    );
  typia.assert(originalCategory);
  const originalName = originalCategory.name;
  const originalDescription = originalCategory.description;
  const originalId = originalCategory.id;
  const originalUpdatedAt = originalCategory.updated_at;
  // 4. Update the category with new name and description
  const newName = `${RandomGenerator.alphabets(5)}_Updated`;
  const newDescription = RandomGenerator.paragraph({ sentences: 2 });
  // Small delay to ensure updated_at will be different
  await new Promise((resolve) => setTimeout(resolve, 100));
  const updatedCategory =
    await api.functional.ecommerceMall.admin.categories.update(
      adminConnection,
      {
        categoryId: originalId,
        body: {
          name: newName,
          description: newDescription,
        } satisfies IEcommerceMallCategory.IUpdate,
      },
    );
  typia.assert(updatedCategory);
  // 5. Validate the response
  TestValidator.equals(
    "category ID remains unchanged",
    updatedCategory.id,
    originalId,
  );
  TestValidator.equals("name is updated", updatedCategory.name, newName);
  TestValidator.equals(
    "description is updated",
    updatedCategory.description ?? null,
    newDescription,
  );
  TestValidator.predicate(
    "updated_at is refreshed",
    updatedCategory.updated_at > originalUpdatedAt,
  );
  TestValidator.equals("parent remains null", updatedCategory.parent, null);
  TestValidator.equals(
    "created_at unchanged",
    updatedCategory.created_at,
    originalCategory.created_at,
  );
}
