import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallProductTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductTag";

export async function test_api_admin_product_tag_update_unauthorized_access(
  connection: api.IConnection,
) {
  // 1. Arrange: create an admin and join to obtain an authenticated admin context
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallAdminJoin.ICreate;

  const adminAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);

  // 2. Arrange: create a real product tag under this authenticated admin
  const createdTag: IShoppingMallProductTag =
    await api.functional.shoppingMall.admin.productTags.create(connection, {
      body: {
        code: RandomGenerator.alphaNumeric(8),
        label: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.paragraph({ sentences: 4 }),
        isActive: true,
      } satisfies IShoppingMallProductTag.ICreate,
    });
  typia.assert(createdTag);

  // 3. Prepare a valid update payload
  const updateBody = {
    label: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.paragraph({ sentences: 5 }),
    isActive: false,
  } satisfies IShoppingMallProductTag.IUpdate;

  // 4. Derive an unauthenticated connection: new connection object without headers
  const unauthenticatedConnection: api.IConnection = {
    ...connection,
    headers: {},
  };

  // 5. Act & Assert: calling update without auth must fail
  await TestValidator.error(
    "unauthenticated admin product tag update must be rejected",
    async () => {
      await api.functional.shoppingMall.admin.productTags.update(
        unauthenticatedConnection,
        {
          productTagId: createdTag.id,
          body: updateBody,
        },
      );
    },
  );

  // 6. We cannot reload the tag state because no GET endpoint is provided in
  //    the SDK, but we at least confirm the originally created tag snapshot
  //    remains well-typed.
  typia.assert(createdTag);
}
