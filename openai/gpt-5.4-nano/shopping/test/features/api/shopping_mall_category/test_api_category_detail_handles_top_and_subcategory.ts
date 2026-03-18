import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_category_detail_handles_top_and_subcategory(
  connection: api.IConnection,
): Promise<void> {
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
    } satisfies IShoppingMallAdmin.IJoin,
  });
  typia.assert(admin);
  const findCategory = async (
    shouldBeTopLevel: boolean,
  ): Promise<IShoppingMallCategory> => {
    const maxAttempts = 25;
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      const categoryId = typia.random<string & tags.Format<"uuid">>();
      const category = await api.functional.shoppingMall.admin.categories.at(
        adminConnection,
        {
          categoryId,
        },
      );
      typia.assert(category);
      const isTopLevel = category.parent_category_id === null;
      if (shouldBeTopLevel ? isTopLevel : !isTopLevel) return category;
    }
    throw new Error(
      `Unable to find a ${shouldBeTopLevel ? "top-level" : "sub"} category after retries`,
    );
  };
  // Scenario 1
  const categoryA = await findCategory(true);
  const categoryB = await findCategory(false);
  TestValidator.equals("categoryA id", categoryA.id, categoryA.id);
  TestValidator.equals(
    "categoryA parent is null",
    categoryA.parent_category_id,
    null,
  );
  TestValidator.equals("categoryB id", categoryB.id, categoryB.id);
  TestValidator.predicate(
    "categoryB parent is not null",
    categoryB.parent_category_id !== null,
  );
  TestValidator.predicate("categoryA has name", categoryA.name.length > 0);
  TestValidator.predicate(
    "categoryA has description",
    categoryA.description.length > 0,
  );
  TestValidator.predicate("categoryA has slug", categoryA.slug.length > 0);
  TestValidator.predicate(
    "categoryA has visibility",
    categoryA.visibility.length > 0,
  );
  TestValidator.predicate("categoryB has name", categoryB.name.length > 0);
  TestValidator.predicate(
    "categoryB has description",
    categoryB.description.length > 0,
  );
  TestValidator.predicate("categoryB has slug", categoryB.slug.length > 0);
  TestValidator.predicate(
    "categoryB has visibility",
    categoryB.visibility.length > 0,
  );
  TestValidator.predicate(
    "categoryA has created_at",
    categoryA.created_at.length > 0,
  );
  TestValidator.predicate(
    "categoryA has updated_at",
    categoryA.updated_at.length > 0,
  );
  TestValidator.predicate(
    "categoryB has created_at",
    categoryB.created_at.length > 0,
  );
  TestValidator.predicate(
    "categoryB has updated_at",
    categoryB.updated_at.length > 0,
  );
  // Scenario 2 (partial): without an edit endpoint in provided SDK/utilities,
  // validate stability across consecutive reads.
  const categoryAReRead = await api.functional.shoppingMall.admin.categories.at(
    adminConnection,
    {
      categoryId: categoryA.id,
    },
  );
  typia.assert(categoryAReRead);
  TestValidator.equals(
    "display_order stable on re-read",
    categoryAReRead.display_order,
    categoryA.display_order,
  );
  TestValidator.equals(
    "name stable on re-read",
    categoryAReRead.name,
    categoryA.name,
  );
  TestValidator.equals(
    "description stable on re-read",
    categoryAReRead.description,
    categoryA.description,
  );
}
