import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallProductTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductTag";

/**
 * Validate deletion behavior for non-existent product tag IDs.
 *
 * ## Business goal
 *
 * Ensure that the administrative DELETE
 * /shoppingMall/admin/productTags/{productTagId} endpoint fails cleanly when
 * the caller provides a productTagId that does not correspond to any existing
 * tag, and that such a failure does not have side-effects on legitimately
 * existing tags.
 *
 * ## Scenario
 *
 * 1. Establish an authenticated admin session by calling POST /auth/admin/join.
 *    The response type is IShoppingMallAdmin.IAuthorized, and join will also
 *    populate the connection's Authorization header for subsequent calls.
 * 2. Create one or more valid product tags via POST
 *    /shoppingMall/admin/productTags using
 *    api.functional.shoppingMall.admin.productTags.create. This returns
 *    IShoppingMallProductTag records, whose ids represent valid existing
 *    productTagId values that _must not_ be impacted by the failure scenario.
 * 3. Generate a random UUID string to represent a non-existent product tag id. To
 *    avoid accidental collision with the created tags, generate the UUID after
 *    creation and, if it happens to match any created id, regenerate until it
 *    is distinct. The erase() API just takes a string path parameter, so we
 *    only need to ensure string inequality against the created ids.
 * 4. Invoke api.functional.shoppingMall.admin.productTags.erase with the
 *    non-existent productTagId and assert that the call fails. As we must not
 *    test specific HTTP status codes directly, use TestValidator.error to
 *    assert that an error is thrown when attempting to delete the non-existent
 *    tag ID. The concrete status (e.g., 404) is an implementation detail.
 * 5. As a sanity check for side effects, attempt a delete on one of the actually
 *    created tag IDs and assert that this call _succeeds_ without throwing.
 *    This confirms that valid tags remain operable and that the previous failed
 *    call for the non-existent id did not globally break the endpoint
 *    behavior.
 */
export async function test_api_admin_product_tag_delete_nonexistent_id(
  connection: api.IConnection,
) {
  // 1. Establish an authenticated admin session via POST /auth/admin/join.
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallAdminJoin.ICreate;

  const authorizedAdmin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(authorizedAdmin);

  // 2. Create a couple of product tags to represent existing catalog state.
  const tagBodies = [
    {
      code: `code-${RandomGenerator.alphaNumeric(8)}`,
      label: RandomGenerator.paragraph({
        sentences: 2,
        wordMin: 3,
        wordMax: 8,
      }),
      description: RandomGenerator.paragraph({
        sentences: 4,
        wordMin: 3,
        wordMax: 10,
      }),
      isActive: true,
    },
    {
      code: `code-${RandomGenerator.alphaNumeric(8)}`,
      label: RandomGenerator.paragraph({
        sentences: 2,
        wordMin: 3,
        wordMax: 8,
      }),
      description: RandomGenerator.paragraph({
        sentences: 3,
        wordMin: 3,
        wordMax: 10,
      }),
      isActive: true,
    },
  ] satisfies IShoppingMallProductTag.ICreate[];

  const createdTags: IShoppingMallProductTag[] = [];
  for (const body of tagBodies) {
    const created: IShoppingMallProductTag =
      await api.functional.shoppingMall.admin.productTags.create(connection, {
        body,
      });
    typia.assert(created);
    createdTags.push(created);
  }

  // 3. Generate a UUID that is guaranteed not to match any created tag id.
  const createdIds = createdTags.map((tag) => tag.id);
  let nonexistentId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  while (createdIds.includes(nonexistentId)) {
    nonexistentId = typia.random<string & tags.Format<"uuid">>();
  }

  // 4. Assert that deleting the non-existent ID fails.
  await TestValidator.error(
    "deleting a non-existent product tag id should fail",
    async () => {
      await api.functional.shoppingMall.admin.productTags.erase(connection, {
        productTagId: nonexistentId,
      });
    },
  );

  // 5. Sanity check: deleting a real tag should still succeed.
  const validTag: IShoppingMallProductTag = createdTags[0];
  await api.functional.shoppingMall.admin.productTags.erase(connection, {
    productTagId: validTag.id,
  });

  // We don't have a read/list API to reconfirm state, but successful
  // completion of the valid delete call is enough to show the endpoint still
  // behaves normally for real IDs even after a failed delete on a non-existent
  // ID.
}
