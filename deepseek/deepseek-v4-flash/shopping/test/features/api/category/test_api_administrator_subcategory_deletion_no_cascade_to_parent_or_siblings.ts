import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IECommerceMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallAdministrator";
import type { IECommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCategory";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";
import { generate_random_e_commerce_mall_administrator_categories_create } from "../../../generate/generate_random_e_commerce_mall_administrator_categories_create";
import { prepare_random_ecommerce_mall_category } from "../../../prepare/prepare_random_ecommerce_mall_category";

export async function test_api_administrator_subcategory_deletion_no_cascade_to_parent_or_siblings(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Admin authentication
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_administrator_join(adminConnection, {
    body: typia.random<IECommerceMallAdministrator.IJoin>(),
  });
  typia.assert(admin);
  // Step 2: Create parent top-level category "Electronics"
  const parent =
    await generate_random_e_commerce_mall_administrator_categories_create(
      adminConnection,
      {
        body: {
          name: "Electronics",
          description: "Electronic devices and accessories",
        },
      },
    );
  typia.assert(parent);
  TestValidator.equals(
    "parent is top-level, no parent_id",
    parent.parent,
    null,
  );
  TestValidator.predicate(
    "parent has no deleted_at",
    parent.deleted_at === null,
  );
  // Step 3: Create subcategory "Smartphones" under parent
  const smartphones =
    await generate_random_e_commerce_mall_administrator_categories_create(
      adminConnection,
      {
        body: {
          name: "Smartphones",
          description: "Mobile phones",
          parent_id: parent.id,
        },
      },
    );
  typia.assert(smartphones);
  TestValidator.equals(
    "smartphones parent_id matches parent",
    smartphones.parent!.id,
    parent.id,
  );
  TestValidator.predicate(
    "smartphones has no deleted_at",
    smartphones.deleted_at === null,
  );
  // Step 4: Create sibling subcategory "Laptops" under same parent
  const laptops =
    await generate_random_e_commerce_mall_administrator_categories_create(
      adminConnection,
      {
        body: {
          name: "Laptops",
          description: "Laptop computers",
          parent_id: parent.id,
        },
      },
    );
  typia.assert(laptops);
  TestValidator.equals(
    "laptops parent_id matches parent",
    laptops.parent!.id,
    parent.id,
  );
  TestValidator.predicate(
    "laptops has no deleted_at",
    laptops.deleted_at === null,
  );
  // Step 5: Delete "Smartphones" subcategory
  await api.functional.eCommerceMall.administrator.categories.erase(
    adminConnection,
    {
      categoryId: smartphones.id,
    },
  );
  // Step 6: Verify double deletion fails — proves subcategory was soft-deleted
  await TestValidator.httpError(
    "double deletion should return 404",
    404,
    async () => {
      await api.functional.eCommerceMall.administrator.categories.erase(
        adminConnection,
        {
          categoryId: smartphones.id,
        },
      );
    },
  );
  // Step 7: Verify parent still exists and is usable — proves no upward cascade
  const tablets =
    await generate_random_e_commerce_mall_administrator_categories_create(
      adminConnection,
      {
        body: {
          name: "Tablets",
          description: "Tablet computers",
          parent_id: parent.id,
        },
      },
    );
  typia.assert(tablets);
  TestValidator.equals(
    "tablets created under parent",
    tablets.parent!.id,
    parent.id,
  );
}
