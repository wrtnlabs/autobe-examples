import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallBrand } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallBrand";
import type { IShoppingMallPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdmin";
import type { IShoppingMallPlatformAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdminJoin";

/**
 * Validate public retrieval of a brand created by a platform administrator.
 *
 * Business goals:
 *
 * - Ensure that brands created via the platform-admin-only creation API become
 *   publicly readable through the storefront-facing GET
 *   /shoppingMall/brands/{brandId}.
 * - Confirm that no authentication header is required or used when accessing the
 *   public brand endpoint.
 * - Verify that the retrieved brand data is consistent with what was created and
 *   that repeated retrievals are idempotent.
 *
 * Test Steps:
 *
 * 1. Join as a new platform administrator using POST /auth/platformAdmin/join with
 *    a valid IShoppingMallPlatformAdminJoin.IRequest payload.
 *
 *    - This should return IShoppingMallPlatformAdmin.IAuthorized and automatically
 *         attach the Authorization header to the provided connection instance.
 * 2. Using the now-authenticated connection, create a new brand via POST
 *    /shoppingMall/platformAdmin/brands with an IShoppingMallBrand.ICreate
 *    payload (name, slug, optional description and logo_uri).
 *
 *    - Capture the returned IShoppingMallBrand as createdBrand.
 * 3. Construct an unauthenticated connection by shallow-copying the original
 *    connection and overriding headers to an empty object, e.g.: const
 *    publicConnection: api.IConnection = { ...connection, headers: {} };
 *
 *    - Do not further read or mutate any header properties.
 * 4. Call GET /shoppingMall/brands/{brandId} on
 *    api.functional.shoppingMall.brands.at using publicConnection and
 *    createdBrand.id as brandId.
 *
 *    - Expect this to succeed without requiring any Authorization header.
 *    - Capture the result as publicBrand1 and validate its type via typia.assert.
 * 5. Validate that publicBrand1 reflects the persisted data from createdBrand:
 *
 *    - Id must match createdBrand.id.
 *    - Name must match createdBrand.name.
 *    - Slug must match createdBrand.slug.
 *    - Description equality: both undefined, or same string when defined.
 *    - Logo_uri equality: both undefined, or same string when defined.
 *    - Deleted_at must be undefined (brand is not soft-deleted immediately after
 *         creation).
 * 6. Call the same GET endpoint again with the same publicConnection and brandId,
 *    capturing the result as publicBrand2.
 *
 *    - Assert type via typia.assert.
 *    - Assert deep equality between publicBrand1 and publicBrand2 using
 *         TestValidator.equals to confirm idempotent, consistent reads.
 *
 * Implementation details:
 *
 * - Use RandomGenerator and typia.random to build realistic yet valid request
 *   payloads:
 *
 *   - For join: typia.random<IShoppingMallPlatformAdminJoin.IRequest>().
 *   - For brand creation: typia.random<IShoppingMallBrand.ICreate>().
 * - Use TestValidator.equals/TestValidator.predicate with descriptive titles for
 *   all business-level assertions.
 */
export async function test_api_brand_public_retrieval_after_creation(
  connection: api.IConnection,
) {
  // 1. Register a new platform administrator (join)
  const joinRequest: IShoppingMallPlatformAdminJoin.IRequest =
    typia.random<IShoppingMallPlatformAdminJoin.IRequest>();

  const admin: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: joinRequest,
    });
  typia.assert<IShoppingMallPlatformAdmin.IAuthorized>(admin);

  // 2. Create a new brand as this platform admin
  const createBrandBody: IShoppingMallBrand.ICreate =
    typia.random<IShoppingMallBrand.ICreate>();

  const createdBrand: IShoppingMallBrand =
    await api.functional.shoppingMall.platformAdmin.brands.create(connection, {
      body: createBrandBody,
    });
  typia.assert<IShoppingMallBrand>(createdBrand);

  // 3. Build an unauthenticated connection by overriding headers to an empty object
  const publicConnection: api.IConnection = { ...connection, headers: {} };

  // 4. Publicly retrieve the brand without any Authorization header
  const publicBrand1: IShoppingMallBrand =
    await api.functional.shoppingMall.brands.at(publicConnection, {
      brandId: createdBrand.id,
    });
  typia.assert<IShoppingMallBrand>(publicBrand1);

  // 5. Validate core fields match between created brand and public retrieval
  TestValidator.equals(
    "public brand id matches created brand id",
    publicBrand1.id,
    createdBrand.id,
  );
  TestValidator.equals(
    "public brand name matches created brand name",
    publicBrand1.name,
    createdBrand.name,
  );
  TestValidator.equals(
    "public brand slug matches created brand slug",
    publicBrand1.slug,
    createdBrand.slug,
  );

  // Optional fields: description and logo_uri may be undefined
  TestValidator.equals(
    "public brand description matches created brand description",
    publicBrand1.description ?? undefined,
    createdBrand.description ?? undefined,
  );
  TestValidator.equals(
    "public brand logo_uri matches created brand logo_uri",
    publicBrand1.logo_uri ?? undefined,
    createdBrand.logo_uri ?? undefined,
  );

  // deleted_at is optional; immediately after creation we expect it to be undefined
  TestValidator.equals(
    "newly created brand should not be soft-deleted (deleted_at undefined)",
    publicBrand1.deleted_at ?? undefined,
    undefined,
  );

  // 6. Re-fetch the same brand to verify idempotent, consistent data
  const publicBrand2: IShoppingMallBrand =
    await api.functional.shoppingMall.brands.at(publicConnection, {
      brandId: createdBrand.id,
    });
  typia.assert<IShoppingMallBrand>(publicBrand2);

  TestValidator.equals(
    "public brand second fetch is deeply equal to first fetch",
    publicBrand2,
    publicBrand1,
  );
}
