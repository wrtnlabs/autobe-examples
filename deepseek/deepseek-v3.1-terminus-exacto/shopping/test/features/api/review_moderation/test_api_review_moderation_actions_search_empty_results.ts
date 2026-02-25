import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceAdministrator";
import type { IEcommerceReviewModerationAction } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceReviewModerationAction";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceReviewModerationAction } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceReviewModerationAction";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

export async function test_api_review_moderation_actions_search_empty_results(
  connection: api.IConnection,
): Promise<void> {
  // 1. Administrator authentication using utility function
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IEcommerceAdministrator.IJoin,
  });
  // Reusable random limit generator within constraints
  const randomLimit = () =>
    typia.random<
      number &
        tags.Type<"int32"> &
        tags.Default<20> &
        tags.Minimum<1> &
        tags.Maximum<100>
    >();
  // 2. Test search with invalid action_type (non-existent)
  const invalidActionResult =
    await api.functional.ecommerce.administrator.review_moderation_actions.index(
      adminConnection,
      {
        body: {
          action_type: "invalid_action",
          page: 1,
          limit: randomLimit(),
        } satisfies IEcommerceReviewModerationAction.IRequest,
      },
    );
  typia.assert(invalidActionResult);
  TestValidator.equals(
    "invalid action_type has empty data",
    invalidActionResult.data,
    [],
  );
  TestValidator.equals(
    "invalid action_type records = 0",
    invalidActionResult.pagination.records,
    0,
  );
  TestValidator.equals(
    "invalid action_type pages = 0",
    invalidActionResult.pagination.pages,
    0,
  );
  TestValidator.equals(
    "invalid action_type current page = 1",
    invalidActionResult.pagination.current,
    1,
  );
  TestValidator.predicate(
    "invalid action_type limit matches requested",
    invalidActionResult.pagination.limit >= 1 &&
      invalidActionResult.pagination.limit <= 100,
  );
  // 3. Test search with status 'cancelled' (assuming no such records)
  const cancelledStatusResult =
    await api.functional.ecommerce.administrator.review_moderation_actions.index(
      adminConnection,
      {
        body: {
          status: "cancelled",
          page: 1,
          limit: randomLimit(),
        } satisfies IEcommerceReviewModerationAction.IRequest,
      },
    );
  typia.assert(cancelledStatusResult);
  TestValidator.equals(
    "status cancelled has empty data",
    cancelledStatusResult.data,
    [],
  );
  TestValidator.equals(
    "status cancelled records = 0",
    cancelledStatusResult.pagination.records,
    0,
  );
  TestValidator.equals(
    "status cancelled pages = 0",
    cancelledStatusResult.pagination.pages,
    0,
  );
  TestValidator.equals(
    "status cancelled current page = 1",
    cancelledStatusResult.pagination.current,
    1,
  );
  // 4. Test search with future date range (no records can match)
  const futureFrom = new Date(
    Date.now() + 1000 * 60 * 60 * 24 * 30,
  ).toISOString() satisfies string as string & tags.Format<"date-time">;
  const futureTo = new Date(
    Date.now() + 1000 * 60 * 60 * 24 * 60,
  ).toISOString() satisfies string as string & tags.Format<"date-time">;
  const futureDateResult =
    await api.functional.ecommerce.administrator.review_moderation_actions.index(
      adminConnection,
      {
        body: {
          created_at_from: futureFrom,
          created_at_to: futureTo,
          page: 1,
          limit: randomLimit(),
        } satisfies IEcommerceReviewModerationAction.IRequest,
      },
    );
  typia.assert(futureDateResult);
  TestValidator.equals(
    "future date range has empty data",
    futureDateResult.data,
    [],
  );
  TestValidator.equals(
    "future date range records = 0",
    futureDateResult.pagination.records,
    0,
  );
  // 5. Test search with combination of multiple restrictive filters
  const combinedFilterResult =
    await api.functional.ecommerce.administrator.review_moderation_actions.index(
      adminConnection,
      {
        body: {
          action_type: "non_existent_type",
          status: "non_existent_status",
          created_at_from: futureFrom,
          page: 1,
          limit: randomLimit(),
        } satisfies IEcommerceReviewModerationAction.IRequest,
      },
    );
  typia.assert(combinedFilterResult);
  TestValidator.equals(
    "combined filters have empty data",
    combinedFilterResult.data,
    [],
  );
  TestValidator.equals(
    "combined filters records = 0",
    combinedFilterResult.pagination.records,
    0,
  );
  // 6. Test boundary condition: limit=0 should produce validation error
  await TestValidator.error("limit=0 should fail validation", async () => {
    const zeroLimit = 0 satisfies number as number;
    await api.functional.ecommerce.administrator.review_moderation_actions.index(
      adminConnection,
      {
        body: {
          page: 1,
          limit: zeroLimit,
        } satisfies IEcommerceReviewModerationAction.IRequest,
      },
    );
  });
  // 7. Test request without filters should return data (not empty)
  const unfilteredLimit = randomLimit();
  const unfilteredResult =
    await api.functional.ecommerce.administrator.review_moderation_actions.index(
      adminConnection,
      {
        body: {
          page: 1,
          limit: unfilteredLimit,
        } satisfies IEcommerceReviewModerationAction.IRequest,
      },
    );
  typia.assert(unfilteredResult);
  TestValidator.predicate(
    "unfiltered request returns valid pagination",
    unfilteredResult.pagination.records >= 0 &&
      unfilteredResult.pagination.current === 1 &&
      unfilteredResult.pagination.limit === unfilteredLimit,
  );
}
