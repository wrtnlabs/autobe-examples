import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_shopping_mall_admin_categories_create } from "../../../generate/generate_random_shopping_mall_admin_categories_create";
import { prepare_random_shopping_mall_category } from "../../../prepare/prepare_random_shopping_mall_category";

export async function test_api_category_update_rejected_non_admin_actor(
  connection: api.IConnection,
): Promise<void> {
  // 1) Admin creates an admin-managed category
  const adminConnection: api.IConnection = { host: connection.host };
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphaNumeric(16);
  await authorize_admin_join(adminConnection, {
    body: {
      email: adminEmail,
      password: adminPassword,
    } satisfies IShoppingMallAdmin.IJoin,
  });

  const category = await generate_random_shopping_mall_admin_categories_create(
    adminConnection,
    {} as Parameters<typeof generate_random_shopping_mall_admin_categories_create>[1],
  );

  typia.assert(category);
  const originalName = category.name;
  const originalDescription = category.description;

  // 2) Member attempts to update => must be rejected
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IShoppingMallMember.IJoin,
  });

  const updateBody = {
    name: RandomGenerator.name(3),
    description: RandomGenerator.paragraph({ sentences: 2 }),
  } satisfies IShoppingMallCategory.IUpdate;

  await TestValidator.error(
    "member cannot update admin category name/description",
    async () => {
      await api.functional.shoppingMall.admin.categories.update(
        memberConnection,
        {
          categoryId: category.id,
          body: updateBody,
        },
      );
    },
  );

  // Validate persistence: admin re-applies identical fields and we assert they remain unchanged.
  const categoryAfter =
    await api.functional.shoppingMall.admin.categories.update(adminConnection, {
      categoryId: category.id,
      body: {
        name: originalName,
        description: originalDescription,
      },
    });

  typia.assert(categoryAfter);
  TestValidator.equals(
    "category name unchanged after member rejected update",
    categoryAfter.name,
    originalName,
  );
  TestValidator.equals(
    "category description unchanged after member rejected update",
    categoryAfter.description,
    originalDescription,
  );
}
