import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallSellerSuspension } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerSuspension";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

/**
 * Test retrieving a seller suspension record with a non-existent UUID returns 404 error.
 *
 * Validates proper error handling when attempting to retrieve a seller suspension record
 * using an invalid or non-existent UUID identifier. This test ensures the API correctly
 * identifies and rejects requests for resources that do not exist in the database.
 *
 * **Error Handling Validation:**
 * - When a suspension record with the given UUID does not exist
 * - The API should return HTTP 404 Not Found status
 * - The error message should indicate the resource was not found
 *
 * 1. Administrator authenticates via admin join endpoint.
 * 2. Attempts to retrieve a suspension with an invalid UUID format.
 * 3. API returns 404 error indicating resource not found.
 */
export async function test_api_seller_suspension_retrieval_not_found(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as admin
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  // 2. Attempt to retrieve suspension with non-existent UUID
  const nonExistentSuspensionId =
    "00000000-0000-0000-0000-000000000000" as string & tags.Format<"uuid">;
  // 3. Verify API returns 404 Not Found error
  await TestValidator.httpError(
    "non-existent suspension returns 404",
    404,
    async () =>
      await api.functional.ecommerceMall.admin.admin.seller_suspensions.at(
        adminConnection,
        {
          suspensionId: nonExistentSuspensionId,
        },
      ),
  );
}
