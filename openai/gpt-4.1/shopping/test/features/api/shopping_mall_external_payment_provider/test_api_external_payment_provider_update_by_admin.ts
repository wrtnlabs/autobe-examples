import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallExternalPaymentProvider } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallExternalPaymentProvider";

/**
 * Test that an admin can update an existing external payment provider's
 * configuration in the shopping mall platform.
 *
 * This test completes the following steps:
 *
 * 1. Registers (joins) a new admin account.
 * 2. Authenticates as this admin.
 * 3. Registers a new external payment provider (with unique provider_code and
 *    provider_name).
 * 4. Updates the provider using the update endpoint to change provider_name,
 *    status, and description.
 * 5. Validates that only the updated fields are changed, that updated_at has
 *    changed, and that provider_code remains unchanged.
 * 6. Attempts to update the provider to a duplicate provider_name (expecting an
 *    error due to business rule violation).
 * 7. Validates that admin authentication is required for all management
 *    operations.
 */
export async function test_api_external_payment_provider_update_by_admin(
  connection: api.IConnection,
) {
  // 1. Register a new admin
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphabets(10) + "1!";
  const adminName = RandomGenerator.name();
  const admin = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      name: adminName,
    } satisfies IShoppingMallAdmin.ICreate,
  });
  typia.assert(admin);

  // 2. Register a new external payment provider
  const providerCode = RandomGenerator.alphaNumeric(8);
  const providerName = RandomGenerator.name();
  const createProviderInput = {
    provider_name: providerName,
    provider_code: providerCode,
    status: RandomGenerator.pick(["active", "inactive", "deprecated"] as const),
    description: RandomGenerator.paragraph({ sentences: 4 }),
  } satisfies IShoppingMallExternalPaymentProvider.ICreate;
  const createdProvider =
    await api.functional.shoppingMall.admin.externalPaymentProviders.create(
      connection,
      {
        body: createProviderInput,
      },
    );
  typia.assert(createdProvider);
  TestValidator.equals(
    "provider_code set correctly",
    createdProvider.provider_code,
    providerCode,
  );
  TestValidator.equals(
    "provider_name set correctly",
    createdProvider.provider_name,
    providerName,
  );

  // Save timestamps for audit
  const oldUpdatedAt = createdProvider.updated_at;

  // 3. Update the provider with new values
  const updatedProviderName = RandomGenerator.name();
  const updatedStatus = RandomGenerator.pick([
    "active",
    "inactive",
    "deprecated",
  ] as const);
  const updatedDescription = RandomGenerator.paragraph({ sentences: 5 });
  const updateInput = {
    provider_name: updatedProviderName,
    status: updatedStatus,
    description: updatedDescription,
  } satisfies IShoppingMallExternalPaymentProvider.IUpdate;

  const updatedProvider =
    await api.functional.shoppingMall.admin.externalPaymentProviders.update(
      connection,
      {
        providerCode: providerCode,
        body: updateInput,
      },
    );
  typia.assert(updatedProvider);
  TestValidator.equals(
    "provider_code should not change",
    updatedProvider.provider_code,
    providerCode,
  );
  TestValidator.equals(
    "provider_name updated",
    updatedProvider.provider_name,
    updatedProviderName,
  );
  TestValidator.equals("status updated", updatedProvider.status, updatedStatus);
  TestValidator.equals(
    "description updated",
    updatedProvider.description,
    updatedDescription,
  );
  TestValidator.notEquals(
    "updated_at updated after change",
    updatedProvider.updated_at,
    oldUpdatedAt,
  );

  // 4. Register another provider to test unique provider_name constraint
  const anotherProviderCode = RandomGenerator.alphaNumeric(8);
  const anotherProviderName = RandomGenerator.name();
  const anotherCreateInput = {
    provider_name: anotherProviderName,
    provider_code: anotherProviderCode,
    status: RandomGenerator.pick(["active", "inactive", "deprecated"] as const),
    description: RandomGenerator.paragraph({ sentences: 3 }),
  } satisfies IShoppingMallExternalPaymentProvider.ICreate;
  const anotherProvider =
    await api.functional.shoppingMall.admin.externalPaymentProviders.create(
      connection,
      {
        body: anotherCreateInput,
      },
    );
  typia.assert(anotherProvider);
  // 5. Attempt to update first provider to use the (already taken) anotherProviderName
  await TestValidator.error(
    "Cannot update provider to duplicate provider_name",
    async () => {
      await api.functional.shoppingMall.admin.externalPaymentProviders.update(
        connection,
        {
          providerCode: providerCode,
          body: {
            provider_name: anotherProviderName,
            status: updatedStatus,
            description: RandomGenerator.paragraph({ sentences: 2 }),
          } satisfies IShoppingMallExternalPaymentProvider.IUpdate,
        },
      );
    },
  );

  // 6. Test that authentication is required by attempting to update with a new connection (no token)
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "admin authentication required to update provider",
    async () => {
      await api.functional.shoppingMall.admin.externalPaymentProviders.update(
        unauthConn,
        {
          providerCode: providerCode,
          body: {
            provider_name: RandomGenerator.name(),
            status: RandomGenerator.pick([
              "active",
              "inactive",
              "deprecated",
            ] as const),
            description: RandomGenerator.paragraph({ sentences: 2 }),
          } satisfies IShoppingMallExternalPaymentProvider.IUpdate,
        },
      );
    },
  );
}
