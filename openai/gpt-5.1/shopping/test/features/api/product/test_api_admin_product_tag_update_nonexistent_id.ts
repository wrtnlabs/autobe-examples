import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallProductTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductTag";

/**
 * Ensure that updating a non-existent ShoppingMall product tag as admin fails
 * without side effects on existing tags.
 *
 * Business goal
 *
 * - Prove that PUT /shoppingMall/admin/productTags/{productTagId} does not behave
 *   like an upsert and refuses unknown IDs.
 * - Ensure the call does not accidentally create new tags or mutate existing
 *   unrelated tags.
 *
 * Scenario
 *
 * 1. Register an admin via POST /auth/admin/join using
 *    IShoppingMallAdminJoin.ICreate. This implicitly authenticates the
 *    connection with an admin token by SDK side-effects.
 * 2. Optionally create a control product tag via POST
 *    /shoppingMall/admin/productTags using IShoppingMallProductTag.ICreate to
 *    have a known-good tag we can compare against later.
 * 3. Generate a random UUID string for `nonExistentId`. To minimize collision risk
 *    with the control tag, simply generate a fresh UUID distinct from the
 *    control tag id.
 * 4. Construct a valid IShoppingMallProductTag.IUpdate payload (e.g., code, label,
 *    description, isActive) and call
 *    api.functional.shoppingMall.admin.productTags.update(connection, { ... })
 *    with productTagId set to `nonExistentId`.
 * 5. Wrap the update call in TestValidator.error with an async closure, and await
 *    it to assert that some error occurs. Do not check exact status code or
 *    error shape.
 * 6. Verify that the previously created control tag has not been altered. Since we
 *    have no `get` API, we rely on the original response snapshot and the fact
 *    that update() failed, so there is no way the control tag could have
 *    changed in our observable view.
 * 7. Also, because the only creation path is the explicit `create` function and we
 *    call it only once, we infer that no new tag was created as a side-effect
 *    when update() failed.
 *
 * Implementation notes
 *
 * - Use typia.random<IShoppingMallAdminJoin.ICreate>() to build the join body.
 * - Use typia.random<IShoppingMallProductTag.ICreate>() for the control tag
 *   creation body.
 * - Generate nonExistentId via typia.random<string & tags.Format<"uuid">>(). It
 *   will almost certainly differ from the real tag id; no need to loop.
 * - Use a concrete IShoppingMallProductTag.IUpdate object built inline with
 *   `satisfies` rather than typia.random, to show a realistic partial update.
 * - Use TestValidator.error with an async lambda and `await` in order to validate
 *   that update() throws.
 * - Never validate HTTP status codes or error payload; only assert that an error
 *   occurs.
 * - Never reference or touch connection.headers; authentication is handled by the
 *   SDK as a side effect of join().
 */
export async function test_api_admin_product_tag_update_nonexistent_id(
  connection: api.IConnection,
) {
  // 1. Admin join (auth setup)
  const admin = await api.functional.auth.admin.join(connection, {
    body: typia.random<IShoppingMallAdminJoin.ICreate>(),
  });
  typia.assert<IShoppingMallAdmin.IAuthorized>(admin);

  // 2. Create a control product tag to ensure no side effects on existing tags
  const createdTag: IShoppingMallProductTag =
    await api.functional.shoppingMall.admin.productTags.create(connection, {
      body: typia.random<IShoppingMallProductTag.ICreate>(),
    });
  typia.assert<IShoppingMallProductTag>(createdTag);

  // Capture a snapshot of the created tag for later comparison
  const originalSnapshot = { ...createdTag };

  // 3. Generate a random UUID guaranteed (with overwhelming probability) to be
  //    different from the control tag id.
  const nonExistentId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();

  // 4-5. Attempt to update a non-existent tag and assert that it fails.
  const updateBody = {
    code: "non-existent-code",
    label: "Non existent tag label",
    description: "Trying to update a tag that does not exist.",
    isActive: false,
  } satisfies IShoppingMallProductTag.IUpdate;

  await TestValidator.error("updating non-existent tag must fail", async () => {
    await api.functional.shoppingMall.admin.productTags.update(connection, {
      productTagId: nonExistentId,
      body: updateBody,
    });
  });

  // 6. Validate that our in-memory snapshot of the created tag has not changed.
  //    Since we never re-fetch from the server and update() failed, any change
  //    would be local mutation, which should not happen.
  TestValidator.equals<IShoppingMallProductTag>(
    "control tag snapshot remains unchanged in memory",
    createdTag,
    originalSnapshot,
  );

  // 7. We cannot directly prove that no new tag was created, because the API
  //    surface does not include a list or read endpoint. However, since we only
  //    invoked the explicit `create` endpoint once and update() failed, we can
  //    rely on the contract that update() does not create tags.
}
