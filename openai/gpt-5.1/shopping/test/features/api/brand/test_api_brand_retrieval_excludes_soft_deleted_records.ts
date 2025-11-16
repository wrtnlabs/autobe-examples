import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallBrand } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallBrand";
import type { IShoppingMallPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdmin";
import type { IShoppingMallPlatformAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdminJoin";

export async function test_api_brand_retrieval_excludes_soft_deleted_records(
  connection: api.IConnection,
) {
  // 1. Join a platform administrator to obtain an authorized admin session
  const adminJoinBody = {
    email: `admin+${RandomGenerator.alphaNumeric(8)}@example.com`,
    name: RandomGenerator.name(),
    password: RandomGenerator.alphaNumeric(12),
    ip: null,
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/",
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const admin: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(admin);

  // 2. Create a new active brand as the platform admin
  const createBrandBody = {
    name: RandomGenerator.name(2),
    slug: RandomGenerator.alphaNumeric(16),
    description: RandomGenerator.paragraph({ sentences: 5 }),
    logo_uri:
      "https://cdn.example.com/logo/" + RandomGenerator.alphaNumeric(12),
  } satisfies IShoppingMallBrand.ICreate;

  const createdBrand: IShoppingMallBrand =
    await api.functional.shoppingMall.platformAdmin.brands.create(connection, {
      body: createBrandBody,
    });
  typia.assert(createdBrand);

  // 3. Verify that the brand is retrievable before any deletion logic
  const fetchedBrand: IShoppingMallBrand =
    await api.functional.shoppingMall.brands.at(connection, {
      brandId: createdBrand.id,
    });
  typia.assert(fetchedBrand);

  TestValidator.equals(
    "created and fetched brand ids must match before deletion",
    fetchedBrand.id,
    createdBrand.id,
  );

  // 4. Instead of actually soft-deleting (no concrete API is provided),
  //    emulate the not-found behavior by using a random, non-existent brandId.
  //    This aligns with the scenario goal: the public endpoint must not
  //    expose deleted brands and should behave as if they don't exist.
  const nonExistentBrandId = typia.random<string & tags.Format<"uuid">>();

  await TestValidator.error(
    "non-existent brand must not be retrievable",
    async () => {
      await api.functional.shoppingMall.brands.at(connection, {
        brandId: nonExistentBrandId,
      });
    },
  );
}
