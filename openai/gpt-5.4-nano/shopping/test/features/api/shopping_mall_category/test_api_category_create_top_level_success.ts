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

export async function test_api_category_create_top_level_success(
  connection: api.IConnection,
): Promise<void> {
  const adminConnection: api.IConnection = { host: connection.host };
  const credentials = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
  } satisfies IShoppingMallAdmin.IJoin;
  const adminAuth: IShoppingMallAdmin.IAuthorized = await authorize_admin_join(
    adminConnection,
    { body: credentials },
  );
  typia.assert(adminAuth);
  const name = RandomGenerator.name(3);
  const description = RandomGenerator.paragraph({ sentences: 2 });
  const slug = `${RandomGenerator.alphabets(10)}-${RandomGenerator.alphabets(5)}`;
  const display_order = typia.random<number & tags.Type<"int32">>();
  // Use a visibility value that is likely accepted by domain rules.
  // If your backend uses different visibility enums, update this literal.
  const visibility = "active";
  const body = {
    parent_category_id: null,
    name,
    description,
    slug,
    visibility,
    display_order,
  } satisfies IShoppingMallCategory.ICreate;
  const created: IShoppingMallCategory =
    await generate_random_shopping_mall_admin_categories_create(
      adminConnection,
      { body },
    );
  typia.assert(created);
  TestValidator.predicate("category id is non-empty", created.id.length > 0);
  TestValidator.equals(
    "parent_category_id is null for top-level",
    created.parent_category_id,
    null,
  );
  TestValidator.equals("name matches", created.name, name);
  TestValidator.equals("description matches", created.description, description);
  TestValidator.equals("slug matches", created.slug, slug);
  TestValidator.equals("visibility matches", created.visibility, visibility);
  TestValidator.equals(
    "display_order matches",
    created.display_order,
    display_order,
  );
  TestValidator.equals(
    "deleted_at should be null (active state)",
    created.deleted_at,
    null,
  );
  const createdAt = new Date(created.created_at).getTime();
  const updatedAt = new Date(created.updated_at).getTime();
  TestValidator.predicate("created_at <= updated_at", createdAt <= updatedAt);
}
