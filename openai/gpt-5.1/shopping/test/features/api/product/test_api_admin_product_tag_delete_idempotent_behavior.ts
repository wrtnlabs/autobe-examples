import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallProductTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductTag";

export async function test_api_admin_product_tag_delete_idempotent_behavior(
  connection: api.IConnection,
) {
  // 1. Register an admin and obtain authenticated context.
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    href: "https://admin.test.local/join", // realistic frontend URL
    referrer: "https://admin.test.local/landing", // realistic referrer URL
    ip: null,
  } satisfies IShoppingMallAdminJoin.ICreate;

  const adminAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert<IShoppingMallAdmin.IAuthorized>(adminAuthorized);

  // 2. Create a product tag to be deleted.
  const createTagBody = {
    code: RandomGenerator.alphaNumeric(12),
    label: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.paragraph({ sentences: 4 }),
    isActive: true,
  } satisfies IShoppingMallProductTag.ICreate;

  const createdTag: IShoppingMallProductTag =
    await api.functional.shoppingMall.admin.productTags.create(connection, {
      body: createTagBody,
    });
  typia.assert<IShoppingMallProductTag>(createdTag);

  // 3. First delete must succeed without error.
  await api.functional.shoppingMall.admin.productTags.erase(connection, {
    productTagId: createdTag.id,
  });

  // Use a predicate to record that we reached this point without error.
  TestValidator.predicate(
    "first delete of product tag should succeed without throwing",
    true,
  );

  // 4. Second delete: must be idempotent. Accept either success or 404 HttpError.
  let secondDeleteSucceeded = false;
  let secondDeleteNotFound = false;

  try {
    await api.functional.shoppingMall.admin.productTags.erase(connection, {
      productTagId: createdTag.id,
    });
    secondDeleteSucceeded = true;
  } catch (exp) {
    if (exp instanceof api.HttpError && exp.status === 404) {
      secondDeleteNotFound = true;
    } else {
      // Any other error is considered invalid behavior for idempotent delete.
      throw exp;
    }
  }

  // 5. Validate that either success or not-found behavior occurred.
  TestValidator.predicate(
    "second delete must either succeed or return 404 as valid idempotent behavior",
    secondDeleteSucceeded || secondDeleteNotFound,
  );
}
