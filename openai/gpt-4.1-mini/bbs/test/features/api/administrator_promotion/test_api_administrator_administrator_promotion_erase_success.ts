import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministrator";
import type { IDiscussionBoardAdministratorPromotion } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorPromotion";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

export async function test_api_administrator_administrator_promotion_erase_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Administrator registration for authorization
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_administrator_join(adminConnection, {
    body: {},
  });
  typia.assert(adminAuth);
  adminConnection.headers = {
    Authorization: `Bearer ${adminAuth.token.access}`,
  };
  // 2. Prepare a valid UUID for an administrator promotion to delete
  // Since no promotion create API is available, generate random UUID for test
  // and test erase (it should pass if such id exists, otherwise error)
  // However, scenario requires existing record, so we must assume existence
  // We'll simulate by calling erase with a known random UUID and assert returned value (typia.assert)
  // This is the best feasible approach given scenario, test environment must ensure that ID exists
  const randomPromotionId = typia.random<
    string & tags.Format<"uuid">
  >() satisfies string & tags.Format<"uuid">;
  // 3. Call erase endpoint
  const erased =
    await api.functional.discussionBoard.administrator.administratorPromotions.erase(
      adminConnection,
      { promotionId: randomPromotionId },
    );
  typia.assert(erased);
  // 4. Since we do not have GET endpoint or confirmation procedure,
  // cannot verify non-existence after erase. We trust erase response.
  // 5. No audit log API available for assert, skipped
  // Test passed if no exception and valid erased record
}
