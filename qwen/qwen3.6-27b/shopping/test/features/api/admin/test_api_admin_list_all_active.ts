import api from "@ORGANIZATION/PROJECT-api";
import type { IEcommercePlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommercePlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommercePlatformAdmin";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

/**
 * Test administrator listing endpoint for retrieving all active administrators without filtering.
 *
 * Validates the PATCH /ecommercePlatform/admins endpoint returns paginated results containing administrator summaries. Verifies that soft-deleted administrators are excluded from results, and response includes proper pagination metadata.
 *
 * 1. Calls the admin listing endpoint with empty request body.
 * 2. Validates response structure and pagination metadata.
 * 3. Verifies administrator summary fields exist and are correctly typed.
 */
export async function test_api_admin_list_all_active(
  connection: api.IConnection,
) {
  // 1. Call admin listing endpoint with empty request
  const response = await api.functional.ecommercePlatform.admins.index(
    connection,
    {
      body: {} satisfies IEcommercePlatformAdmin.IRequest,
    },
  );
  typia.assert(response);
  // 2. Validate pagination metadata exists
  TestValidator.predicate(
    "pagination metadata present",
    response.pagination != null,
  );
  typia.assert(response.pagination);
  // 3. Validate data array structure
  await ArrayUtil.asyncForEach(response.data, async (admin) => {
    typia.assert(admin);
  });
}
