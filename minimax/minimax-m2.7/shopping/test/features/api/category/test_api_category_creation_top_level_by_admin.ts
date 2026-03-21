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
import { generate_random_ecommerce_mall_admin_admin_categories_create } from "../../../generate/generate_random_ecommerce_mall_admin_admin_categories_create";
import { prepare_random_ecommerce_mall_category } from "../../../prepare/prepare_random_ecommerce_mall_category";

export async function test_api_category_creation_top_level_by_admin(
  connection: api.IConnection,
): Promise<void> {
  // Authenticate as administrator
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16) as string &
        tags.Format<"password">,
      name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  // Create a new top-level category
  const category =
    await api.functional.ecommerceMall.admin.admin.categories.create(
      adminConnection,
      {
        body: {
          name: "Electronics",
          description: "Devices and gadgets",
        } satisfies IEcommerceMallCategory.ICreate,
      },
    );
  typia.assert(category);
  // Validate response
  TestValidator.equals("category name matches", category.name, "Electronics");
  TestValidator.equals(
    "description matches",
    category.description,
    "Devices and gadgets",
  );
  TestValidator.equals("deleted_at is null", category.deleted_at, null);
  TestValidator.equals(
    "parent is null for top-level category",
    category.parent,
    null,
  );
  TestValidator.predicate(
    "subcategories is empty array",
    category.subcategories.length === 0,
  );
  TestValidator.predicate(
    "has valid UUID id",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      category.id,
    ),
  );
}
