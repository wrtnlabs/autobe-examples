import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallCancellationRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallCancellationRequestSnapshot";
import type { IShoppingMallCancellationRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCancellationRequestSnapshot";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_cancellation_request_snapshots_filter_pagination(
  connection: api.IConnection,
): Promise<void> {
  // Create actor-specific connection
  const clientConnection: api.IConnection = { host: connection.host };
  // Retrieve all snapshots with empty filter (no filtering) - Scenario 1
  const response =
    await api.functional.shoppingMall.cancellationRequestSnapshots.index(
      clientConnection,
      {
        body: {},
      },
    );
  typia.assert(response);
  // Validate pagination metadata presence and range
  TestValidator.predicate(
    "pagination current page >= 1",
    response.pagination.current >= 1,
  );
  TestValidator.predicate(
    "pagination limit >= 1",
    response.pagination.limit >= 1,
  );
  TestValidator.predicate(
    "pagination records >= 0",
    response.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages >= 0",
    response.pagination.pages >= 0,
  );
  // Validate data array
  TestValidator.predicate("data array length >= 0", response.data.length >= 0);
}
