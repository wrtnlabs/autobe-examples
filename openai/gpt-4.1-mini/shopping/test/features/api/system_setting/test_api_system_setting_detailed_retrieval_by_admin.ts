import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallSystemSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSystemSetting";

/**
 * Test the retrieval of detailed information for a specific system setting by
 * its unique ID. The scenario involves authenticating as an admin, creating a
 * system setting, and then retrieving its details by the ID. Validate that the
 * retrieved data matches the created record and includes all required fields
 * such as key, value, description, and timestamps. Confirm that unauthorized
 * access is denied if not authenticated as admin.
 */
export async function test_api_system_setting_detailed_retrieval_by_admin(
  connection: api.IConnection,
) {
  // 1. Admin user registration and authentication
  const adminEmail: string = typia.random<string & tags.Format<"email">>();
  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: "P@ssword1234",
        full_name: RandomGenerator.name(2),
      } satisfies IShoppingMallAdmin.IJoin,
    });
  typia.assert(admin);

  // 2. Create a system setting
  const createBody = {
    key: `setting_${RandomGenerator.alphaNumeric(6)}`,
    value: RandomGenerator.alphaNumeric(12),
    description: RandomGenerator.paragraph({ sentences: 4 }),
  } satisfies IShoppingMallSystemSetting.ICreate;
  const createdSetting: IShoppingMallSystemSetting =
    await api.functional.shoppingMall.admin.systemSettings.create(connection, {
      body: createBody,
    });
  typia.assert(createdSetting);

  // 3. Retrieve the system setting details by its ID
  const retrievedSetting: IShoppingMallSystemSetting =
    await api.functional.shoppingMall.admin.systemSettings.at(connection, {
      id: createdSetting.id,
    });
  typia.assert(retrievedSetting);

  // 4. Validate that retrieved data matches the created record in all fields
  TestValidator.equals(
    "id matches created record",
    retrievedSetting.id,
    createdSetting.id,
  );
  TestValidator.equals(
    "key matches created record",
    retrievedSetting.key,
    createBody.key,
  );
  TestValidator.equals(
    "value matches created record",
    retrievedSetting.value,
    createBody.value,
  );
  TestValidator.equals(
    "description matches created record",
    retrievedSetting.description,
    createBody.description,
  );

  // Validate timestamps are non-empty strings
  TestValidator.predicate(
    "created_at is a non-empty string",
    typeof retrievedSetting.created_at === "string" &&
      retrievedSetting.created_at.length > 0,
  );
  TestValidator.predicate(
    "updated_at is a non-empty string",
    typeof retrievedSetting.updated_at === "string" &&
      retrievedSetting.updated_at.length > 0,
  );

  // deleted_at should be null or undefined
  TestValidator.predicate(
    "deleted_at is null or undefined",
    retrievedSetting.deleted_at === null ||
      retrievedSetting.deleted_at === undefined,
  );

  // 5. Attempt to retrieve system setting details without authentication (simulate)
  // Create a fresh connection without authentication headers
  const unauthenticatedConnection: api.IConnection = {
    ...connection,
    headers: {},
  };

  await TestValidator.error(
    "unauthenticated retrieval should fail",
    async () => {
      await api.functional.shoppingMall.admin.systemSettings.at(
        unauthenticatedConnection,
        {
          id: createdSetting.id,
        },
      );
    },
  );
}
