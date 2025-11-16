import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallExternalPaymentProvider } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallExternalPaymentProvider";

/**
 * Validates soft deletion (deactivation) of an external payment provider by an
 * administrator.
 *
 * This test simulates an administrator onboarding (registration with unique
 * email/password/name), then issues a DELETE
 * /shoppingMall/admin/externalPaymentProviders/{providerCode} request (by
 * calling api.functional.shoppingMall.admin.externalPaymentProviders.erase). It
 * uses random, collision-resistant providerCode values for repeatability.
 *
 * The test asserts:
 *
 * 1. The erased provider object is returned and type-checked.
 * 2. The 'deleted_at' field on the returned provider is set (not null/undefined),
 *    indicating successful soft deletion.
 * 3. The provider's 'provider_code' in the response matches the code used in the
 *    delete operation.
 * 4. The result is still a valid IShoppingMallExternalPaymentProvider instance,
 *    confirming record retention for audit/compliance.
 *
 * Assumes a provider with the providerCode exists as a fixture or in external
 * test data, as the API does not allow direct creation in the provided scope.
 * Thus, random providerCodes are used for negative coverage only if available.
 * Only the soft delete happy path is exercised.
 */
export async function test_api_external_payment_provider_soft_delete_by_admin(
  connection: api.IConnection,
) {
  // 1. Register admin account
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = typia.random<
    string & tags.MinLength<8> & tags.Format<"password">
  >();
  const adminName = RandomGenerator.name();
  const admin = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      name: adminName,
    } satisfies IShoppingMallAdmin.ICreate,
  });
  typia.assert(admin);

  // 2. Attempt to erase (soft delete) provider with a random providerCode (for test, assumes such a provider exists)
  const providerCode = typia.random<string>();
  const erased =
    await api.functional.shoppingMall.admin.externalPaymentProviders.erase(
      connection,
      { providerCode },
    );
  typia.assert(erased);

  // 3. Validation: soft delete and information retention
  TestValidator.equals(
    "response provider_code matches request providerCode",
    erased.provider_code,
    providerCode,
  );
  TestValidator.predicate(
    "deleted_at is set after soft delete",
    erased.deleted_at !== null && erased.deleted_at !== undefined,
  );
}
