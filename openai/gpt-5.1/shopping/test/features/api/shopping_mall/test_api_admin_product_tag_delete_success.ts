import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallProductTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductTag";

export async function test_api_admin_product_tag_delete_success(
  connection: api.IConnection,
) {
  // 1. Register an admin to obtain an authorized admin context.
  const adminJoinBody = typia.random<IShoppingMallAdminJoin.ICreate>();
  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert<IShoppingMallAdmin.IAuthorized>(admin);

  // 2. Create a product tag that will later be deleted.
  const createTagBody = typia.random<IShoppingMallProductTag.ICreate>();
  const tag: IShoppingMallProductTag =
    await api.functional.shoppingMall.admin.productTags.create(connection, {
      body: createTagBody,
    });
  typia.assert<IShoppingMallProductTag>(tag);

  // Basic semantic sanity check before deletion: tag must have a UUID id.
  TestValidator.predicate("created tag id should be a non-empty string", () => {
    return typeof tag.id === "string" && tag.id.length > 0;
  });

  // 3. Delete the created product tag using the admin context.
  await api.functional.shoppingMall.admin.productTags.erase(connection, {
    productTagId: tag.id,
  });

  // 4. Business rule assertion: deletion completed without throwing an error.
  //    If erase had failed (e.g., due to authorization or integrity issues),
  //    the call above would have thrown, failing this test. To make this
  //    explicit, we can assert a trivial true predicate here.
  TestValidator.predicate(
    "admin should be able to delete an existing product tag successfully",
    true,
  );
}
