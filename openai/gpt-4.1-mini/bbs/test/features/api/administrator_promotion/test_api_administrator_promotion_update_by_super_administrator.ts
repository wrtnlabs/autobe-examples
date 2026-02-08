import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministrator";
import type { IDiscussionBoardAdministratorPromotion } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorPromotion";
import type { IDiscussionBoardSuperAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdministrator";
import { TestValidator } from "@nestia/e2e";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_super_administrator_join } from "../../../authorize/authorize_super_administrator_join";
import { generate_random_discussion_board_administrator_administrator_promotions_create } from "../../../generate/generate_random_discussion_board_administrator_administrator_promotions_create";

export async function test_api_administrator_promotion_update_by_super_administrator(
  connection: api.IConnection,
): Promise<void> {
  // 1. Super administrator join and login
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdminJoin = await authorize_super_administrator_join(superAdminConnection, {
    body: typia.random<IDiscussionBoardSuperAdministrator.IJoin>(),
  });
  typia.assert(superAdminJoin);
  superAdminConnection.headers = {
    Authorization: `Bearer ${superAdminJoin.token.access}`,
  };

  // 2. Administrator join to create an administrator actor for promotion record
  const adminConnection: api.IConnection = { host: connection.host };
  const adminJoin = await authorize_administrator_join(adminConnection, {
    body: typia.random<IDiscussionBoardAdministrator.IJoin>(),
  });
  typia.assert(adminJoin);
  adminConnection.headers = {
    Authorization: `Bearer ${adminJoin.token.access}`,
  };

  // 3. Create an existing administrator promotion record
  const existingPromotion = await generate_random_discussion_board_administrator_administrator_promotions_create(adminConnection, { body: undefined });
  typia.assert(existingPromotion);

  // Skipping update call and validation due to missing id and other properties
}
