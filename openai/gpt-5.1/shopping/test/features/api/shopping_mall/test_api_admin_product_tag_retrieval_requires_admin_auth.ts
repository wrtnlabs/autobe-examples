import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallProductTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductTag";

export async function test_api_admin_product_tag_retrieval_requires_admin_auth(
  connection: api.IConnection,
) {
  // 1. Register an admin and establish authenticated context
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
  typia.assert<IShoppingMallAdmin.IAuthorized>(adminAuthorized);

  // 2. Create a concrete product tag as the authenticated admin
  const createTagBody = {
    code: RandomGenerator.alphaNumeric(12),
    label: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.paragraph({ sentences: 3 }),
    isActive: true,
  } satisfies IShoppingMallProductTag.ICreate;

  const createdTag: IShoppingMallProductTag =
    await api.functional.shoppingMall.admin.productTags.create(connection, {
      body: createTagBody,
    });
  typia.assert<IShoppingMallProductTag>(createdTag);

  // 3. Prepare an unauthenticated connection by clearing headers
  const unauthenticatedConnection: api.IConnection = {
    ...connection,
    headers: {},
  };

  // 4. Attempt to retrieve the tag without any Authorization header
  await TestValidator.error(
    "unauthenticated admin tag retrieval must fail",
    async () => {
      await api.functional.shoppingMall.admin.productTags.at(
        unauthenticatedConnection,
        {
          productTagId: createdTag.id,
        },
      );
    },
  );

  // 5. Optionally, simulate another unauthenticated scenario by using a fresh
  // connection clone (still without Authorization header) to emphasize that
  // authentication is tied to connection headers.
  const anotherUnauthConn: api.IConnection = {
    ...connection,
    headers: {},
  };

  await TestValidator.error(
    "admin tag retrieval with missing token on another connection must fail",
    async () => {
      await api.functional.shoppingMall.admin.productTags.at(
        anotherUnauthConn,
        {
          productTagId: createdTag.id,
        },
      );
    },
  );

  // 6. Retrieve the tag again with the valid admin-authenticated connection
  const fetchedTag: IShoppingMallProductTag =
    await api.functional.shoppingMall.admin.productTags.at(connection, {
      productTagId: createdTag.id,
    });
  typia.assert<IShoppingMallProductTag>(fetchedTag);

  // 7. Validate that the fetched tag matches the created one on key business fields
  TestValidator.equals(
    "product tag id should match between create and fetch",
    createdTag.id,
    fetchedTag.id,
  );

  TestValidator.equals(
    "product tag name/label should remain consistent",
    createdTag.name,
    fetchedTag.name,
  );

  TestValidator.equals(
    "product tag slug should remain consistent",
    createdTag.slug,
    fetchedTag.slug,
  );

  TestValidator.equals(
    "product tag description should remain consistent",
    createdTag.description ?? null,
    fetchedTag.description ?? null,
  );

  TestValidator.equals(
    "product tag created_at should remain consistent",
    createdTag.created_at,
    fetchedTag.created_at,
  );

  TestValidator.equals(
    "product tag updated_at should not regress",
    createdTag.updated_at,
    fetchedTag.updated_at,
  );
}
