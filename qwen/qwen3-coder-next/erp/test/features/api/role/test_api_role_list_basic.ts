import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmTrackerRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTrackerRole";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHrmTrackerRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmTrackerRole";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_role_list_basic(
  connection: api.IConnection,
): Promise<void> {
  // Create test request with default pagination using typia.random for robustness
  const body = {
    ...typia.random<IHrmTrackerRole.IRequest>(),
    name: "",
    is_custom: false,
    is_default: false,
  } satisfies IHrmTrackerRole.IRequest;
  // Call the roles index endpoint
  const response = await api.functional.hrmTracker.roles.index(connection, {
    body: body,
  });
  // Validate the complete response structure
  typia.assert(response);
  // Verify data array exists
  TestValidator.predicate(
    "response has data array",
    Array.isArray(response.data),
  );
  // Verify we got some roles back
  TestValidator.predicate("response contains roles", response.data.length > 0);
  // Verify pagination metadata
  TestValidator.predicate(
    "pagination has valid current page",
    response.pagination.current >= 1,
  );
  TestValidator.predicate(
    "pagination has valid limit",
    response.pagination.limit > 0,
  );
  TestValidator.predicate(
    "pagination has valid total records",
    response.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination has valid pages count",
    response.pagination.pages >= 0,
  );
}
