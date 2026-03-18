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
import { generate_random_shopping_mall_admin_categories_create } from "../../../generate/generate_random_shopping_mall_admin_categories_create";
import { prepare_random_shopping_mall_category } from "../../../prepare/prepare_random_shopping_mall_category";

export async function test_api_category_create_one_level_subcategory_success(
  connection: api.IConnection,
): Promise<void> {
  const adminConnection: api.IConnection = { host: connection.host };
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = typia.random<string & tags.Format<"password">>();
  await authorize_admin_join(adminConnection, {
    body: {
      email: adminEmail,
      password: adminPassword,
    } satisfies IShoppingMallAdmin.IJoin,
  });
  const parentName = RandomGenerator.name();
  const parentDescription = RandomGenerator.paragraph({ sentences: 2 });
  const parentSlug = `${RandomGenerator.alphabets(10)}-${RandomGenerator.alphabets(6)}`;
  const parentVisibility = RandomGenerator.alphabets(8);
  const parentDisplayOrder = typia.random<number & tags.Type<"int32">>();
  const parent = await generate_random_shopping_mall_admin_categories_create(
    adminConnection,
    {
      body: {
        parent_category_id: null,
        name: parentName,
        description: parentDescription,
        slug: parentSlug,
        visibility: parentVisibility,
        display_order: parentDisplayOrder,
      } satisfies IShoppingMallCategory.ICreate,
    },
  );
  typia.assert(parent);
  const subName = RandomGenerator.name();
  const subDescription = RandomGenerator.paragraph({ sentences: 3 });
  const subSlug = `${RandomGenerator.alphabets(10)}-${RandomGenerator.alphabets(6)}`;
  const subVisibility = RandomGenerator.alphabets(8);
  const subDisplayOrder = typia.random<number & tags.Type<"int32">>();
  const sub = await generate_random_shopping_mall_admin_categories_create(
    adminConnection,
    {
      body: {
        parent_category_id: parent.id,
        name: subName,
        description: subDescription,
        slug: subSlug,
        visibility: subVisibility,
        display_order: subDisplayOrder,
      } satisfies IShoppingMallCategory.ICreate,
    },
  );
  typia.assert(sub);
  TestValidator.equals(
    "subcategory parent_category_id matches parent",
    sub.parent_category_id,
    parent.id,
  );
  TestValidator.notEquals(
    "subcategory id differs from parent id",
    sub.id,
    parent.id,
  );
  TestValidator.equals("subcategory name matches", sub.name, subName);
  TestValidator.equals(
    "subcategory description matches",
    sub.description,
    subDescription,
  );
  TestValidator.equals("subcategory slug matches", sub.slug, subSlug);
  TestValidator.equals(
    "subcategory visibility matches",
    sub.visibility,
    subVisibility,
  );
  TestValidator.equals(
    "subcategory display_order matches",
    sub.display_order,
    subDisplayOrder,
  );
  TestValidator.equals("subcategory deleted_at is null", sub.deleted_at, null);
  const parentBaseline = {
    id: parent.id,
    name: parent.name,
    description: parent.description,
    slug: parent.slug,
    visibility: parent.visibility,
    display_order: parent.display_order,
    deleted_at: parent.deleted_at,
  } satisfies Pick<
    IShoppingMallCategory,
    | "id"
    | "name"
    | "description"
    | "slug"
    | "visibility"
    | "display_order"
    | "deleted_at"
  >;
  const refetchedParent = await api.functional.shoppingMall.admin.categories.at(
    adminConnection,
    {
      categoryId: parent.id,
    },
  );
  typia.assert(refetchedParent);
  TestValidator.equals(
    "parent id unchanged",
    refetchedParent.id,
    parentBaseline.id,
  );
  TestValidator.equals(
    "parent name unchanged",
    refetchedParent.name,
    parentBaseline.name,
  );
  TestValidator.equals(
    "parent description unchanged",
    refetchedParent.description,
    parentBaseline.description,
  );
  TestValidator.equals(
    "parent slug unchanged",
    refetchedParent.slug,
    parentBaseline.slug,
  );
  TestValidator.equals(
    "parent visibility unchanged",
    refetchedParent.visibility,
    parentBaseline.visibility,
  );
  TestValidator.equals(
    "parent display_order unchanged",
    refetchedParent.display_order,
    parentBaseline.display_order,
  );
  TestValidator.equals(
    "parent deleted_at unchanged",
    refetchedParent.deleted_at,
    parentBaseline.deleted_at,
  );
}
