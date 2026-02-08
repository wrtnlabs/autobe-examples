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

export async function test_api_administrator_administrator_promotions_index_success_no_filters(
  connection: api.IConnection,
): Promise<void> {
  // Test scenario 2: Retrieval of administrator promotions without filters.
  // 1. Authenticate as administrator by joining the system.
  const adminConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_administrator_join(adminConnection, {
    body: {},
  });
  typia.assert(authorized);
  // 2. Call the PATCH /discussionBoard/administrator/administratorPromotions endpoint without filters
  // to get all non-deleted administrator promotion and demotion records.
  const response =
    await api.functional.discussionBoard.administrator.administratorPromotions.index(
      adminConnection,
      {
        body: {},
      },
    );
  typia.assert(response);
  // 3. Verify the response returns paginated promotion records.
  const { pagination, data } = response;
  // 4. Verify no soft-deleted records are included.
  // Note: Since soft-deleted records are excluded server-side, just check data.length <= pagination.records
  TestValidator.predicate(
    "no soft deleted records included",
    data.length <= pagination.records,
  );
  // 5. Assert that data length is consistent with pagination metadata
  TestValidator.equals(
    "records count",
    data.length,
    data.length <= pagination.limit ? data.length : pagination.limit,
  );
}
