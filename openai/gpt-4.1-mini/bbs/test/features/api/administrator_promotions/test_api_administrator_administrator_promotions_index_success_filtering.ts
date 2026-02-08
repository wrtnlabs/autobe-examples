import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministrator";
import type { IDiscussionBoardAdministratorPromotion } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorPromotion";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardAdministratorPromotion } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardAdministratorPromotion";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

/**
 * Test successful retrieval of administrator promotion history with filtering.
 */
export async function test_api_administrator_administrator_promotions_index_success_filtering(
  connection: api.IConnection,
): Promise<void> {
  // 1. Administrator join and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_administrator_join(adminConnection, {
    body: typia.random<IDiscussionBoardAdministrator.IJoin>(),
  });
  typia.assert(authorized);
  adminConnection.headers = { Authorization: authorized.token.access };
  // 2. Prepare filtering parameters - create realistic search filters
  // Since we cannot know exact IDs or emails beforehand (no creation of admins here aside join)
  // Use empty filters or some plausible filter to test pagination and retrieval.
  // Per scenario, include possible filters such as administrator ID, email, old grade ID, new grade ID, date range.
  const filterBody: IDiscussionBoardAdministratorPromotion.IRequest = {
    // The actual filter properties are not specified explicitly in schema (empty object),
    // so use empty object to get all results
  };
  // 3. Call the administrator promotions index endpoint
  const output: IPageIDiscussionBoardAdministratorPromotion.ISummary =
    await api.functional.discussionBoard.administrator.administratorPromotions.index(
      adminConnection,
      { body: filterBody },
    );
  typia.assert(output);
  // 4. Validate pagination metadata consistency
  const { pagination, data } = output;
  TestValidator.predicate("page current positive", pagination.current >= 1);
  TestValidator.predicate("limit positive", pagination.limit >= 1);
  TestValidator.predicate("records not negative", pagination.records >= 0);
  TestValidator.predicate("pages not negative", pagination.pages >= 0);
  // records count matches data length
  TestValidator.equals(
    "records count matches data length",
    data.length,
    pagination.records >= pagination.limit
      ? pagination.limit
      : pagination.records,
  );
  // 5. Validate all records do not have deleted_at (soft deleted) and fields are present (strict property checks)
  data.forEach((record, index) => {
    // Confirm deleted_at is either undefined or null, but per scenario soft-deleted is excluded, so should be nullish
    // Since we don't have deleted_at in schema, we cannot explicitly check it here,
    // so just assert record structure
    typia.assert(record);
  });
}
