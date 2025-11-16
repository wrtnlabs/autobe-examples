import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallExternalPaymentProvider } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallExternalPaymentProvider";

/**
 * Validate admin creation of new external payment provider and uniqueness
 * checks.
 *
 * This test simulates the business scenario where a platform admin must onboard
 * a new external payment provider (such as Stripe or PayPal) to the shopping
 * mall platform. The workflow includes admin authentication, submission of
 * valid provider data, verification of response schema and audit fields, as
 * well as confirming uniqueness enforcement for provider_name and provider_code
 * fields. A duplicate-creation attempt is also made to ensure business logic
 * prevents duplicates.
 *
 * 1. Register a new admin using unique credentials (email, password, name)
 *    ensuring authentication context.
 * 2. Prepare unique provider_name and provider_code values for the new external
 *    payment provider, as well as legal description and status.
 * 3. Submit an externalPaymentProviders.create() API call with valid provider
 *    attributes.
 * 4. Verify the creation response includes correct metadata, all required audit
 *    fields, and matches the DTO type.
 * 5. Assert that returned provider_name and provider_code match the inputs, with
 *    non-empty id and correct status and description.
 * 6. Attempt to create another provider using the same provider_name and
 *    provider_code, and expect creation to fail with an error (uniqueness
 *    enforced).
 * 7. Optionally, test creation with new (different) unique provider_name and
 *    provider_code should still succeed for positive confirmation.
 */
export async function test_api_external_payment_provider_creation_by_admin(
  connection: api.IConnection,
) {
  // 1. Register/admin join
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = typia.random<
    string & tags.MinLength<8> & tags.Format<"password">
  >();
  const adminName = RandomGenerator.name();
  const adminAuth: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: adminPassword,
        name: adminName,
      } satisfies IShoppingMallAdmin.ICreate,
    });
  typia.assert(adminAuth);
  TestValidator.equals(
    "admin email matches input",
    adminAuth.email,
    adminEmail,
  );
  TestValidator.equals("admin name matches input", adminAuth.name, adminName);

  // 2. Prepare unique provider fields
  const providerName = `AutoBE TestPay ${RandomGenerator.alphaNumeric(8)}`;
  const providerCode = `autobe_testpay_${RandomGenerator.alphaNumeric(8)}`;
  const providerStatus = RandomGenerator.pick([
    "active",
    "inactive",
    "deprecated",
  ] as const);
  const providerDescription = RandomGenerator.content({
    paragraphs: 1,
    sentenceMin: 8,
    sentenceMax: 16,
  });

  // 3. Create external payment provider as admin
  const createdProvider: IShoppingMallExternalPaymentProvider =
    await api.functional.shoppingMall.admin.externalPaymentProviders.create(
      connection,
      {
        body: {
          provider_name: providerName,
          provider_code: providerCode,
          status: providerStatus,
          description: providerDescription,
        } satisfies IShoppingMallExternalPaymentProvider.ICreate,
      },
    );
  typia.assert(createdProvider);

  // 4. Validate response and audit fields
  TestValidator.equals(
    "provider_name matches input",
    createdProvider.provider_name,
    providerName,
  );
  TestValidator.equals(
    "provider_code matches input",
    createdProvider.provider_code,
    providerCode,
  );
  TestValidator.equals(
    "status matches input",
    createdProvider.status,
    providerStatus,
  );
  TestValidator.equals(
    "description matches input",
    createdProvider.description,
    providerDescription,
  );
  TestValidator.predicate(
    "provider id is non-empty",
    typeof createdProvider.id === "string" && createdProvider.id.length > 0,
  );
  TestValidator.predicate(
    "created_at is ISO8601 string",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(createdProvider.created_at),
  );
  TestValidator.predicate(
    "updated_at is ISO8601 string",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(createdProvider.updated_at),
  );
  TestValidator.equals(
    "deleted_at should be absent or null",
    createdProvider.deleted_at ?? null,
    null,
  );

  // 5. Attempt to create provider with duplicate name/code
  await TestValidator.error(
    "duplicate provider_name and provider_code creation is rejected",
    async () => {
      await api.functional.shoppingMall.admin.externalPaymentProviders.create(
        connection,
        {
          body: {
            provider_name: providerName,
            provider_code: providerCode,
            status: providerStatus,
            description: providerDescription,
          } satisfies IShoppingMallExternalPaymentProvider.ICreate,
        },
      );
    },
  );

  // 6. Positive creation: creating another provider with unique data should succeed
  const anotherProviderName = `AutoBE TestPay ${RandomGenerator.alphaNumeric(8)}`;
  const anotherProviderCode = `autobe_testpay_${RandomGenerator.alphaNumeric(8)}`;
  const anotherDescription = RandomGenerator.content({
    paragraphs: 1,
    sentenceMin: 8,
    sentenceMax: 16,
  });
  const anotherCreatedProvider: IShoppingMallExternalPaymentProvider =
    await api.functional.shoppingMall.admin.externalPaymentProviders.create(
      connection,
      {
        body: {
          provider_name: anotherProviderName,
          provider_code: anotherProviderCode,
          status: providerStatus,
          description: anotherDescription,
        } satisfies IShoppingMallExternalPaymentProvider.ICreate,
      },
    );
  typia.assert(anotherCreatedProvider);
  TestValidator.equals(
    "second created provider_name matches input",
    anotherCreatedProvider.provider_name,
    anotherProviderName,
  );
  TestValidator.equals(
    "second created provider_code matches input",
    anotherCreatedProvider.provider_code,
    anotherProviderCode,
  );
}
