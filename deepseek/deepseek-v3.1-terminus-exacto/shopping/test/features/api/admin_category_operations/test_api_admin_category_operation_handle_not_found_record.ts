import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceAdministrator";
import type { IEcommerceCacheConfigurationParameterDefinition } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCacheConfigurationParameterDefinition";
import type { IEcommerceCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCategory";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

/**
 * Test handling of non-existent category operation ID.
 * An administrator attempts to retrieve an audit record using an invalid or non-existent UUID.
 * Validate that the endpoint returns appropriate error response (404 Not Found) rather than exposing internal system details.
 */
export async function test_api_admin_category_operation_handle_not_found_record(
  connection: api.IConnection,
): Promise<void> {
  // Create administrator connection
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    },
  });
  typia.assert(admin);
  // Generate a valid UUID that doesn't exist in the system
  const nonExistentId = typia.random<string & tags.Format<"uuid">>();
  // Attempt to retrieve non-existent category operation record
  await TestValidator.httpError(
    "non-existent category operation record",
    404,
    async () => {
      await api.functional.ecommerce.administrator.admin_category_operations.at(
        adminConnection,
        {
          adminCategoryOperationId: nonExistentId,
        },
      );
    },
  );
  // Test with invalid UUID format
  const invalidUuid = "not-a-valid-uuid";
  await TestValidator.httpError("invalid UUID format", 400, async () => {
    // Force invalid UUID type for testing validation
    await api.functional.ecommerce.administrator.admin_category_operations.at(
      adminConnection,
      {
        adminCategoryOperationId: invalidUuid as string & tags.Format<"uuid">,
      },
    );
  });
}
