import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministrator";
import type { IDiscussionBoardAdministratorGrade } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorGrade";
import type { IDiscussionBoardRegisteredUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardRegisteredUser";
import type { IDiscussionBoardSuperAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdministrator";
import type { IDiscussionBoardUserBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUserBan";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_administrator_join } from "../../../authorize/authorize_super_administrator_join";
import { authorize_super_administrator_login } from "../../../authorize/authorize_super_administrator_login";
import { authorize_super_administrator_refresh } from "../../../authorize/authorize_super_administrator_refresh";
import { generate_random_discussion_board_super_administrator_administrator_bans_create } from "../../../generate/generate_random_discussion_board_super_administrator_administrator_bans_create";
import { prepare_random_discussion_board_user_ban } from "../../../prepare/prepare_random_discussion_board_user_ban";

export async function test_api_ban_update_by_super_administrator_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Super administrator joins and obtains authorized connection
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdmin = await authorize_super_administrator_join(
    superAdminConnection,
    {},
  );
  typia.assert(superAdmin);
  // 2. Create an initial ban record as a prerequisite
  const banCreate =
    await generate_random_discussion_board_super_administrator_administrator_bans_create(
      superAdminConnection,
      {
        body: {
          reason: "Initial ban reason",
        },
      },
    );
  typia.assert(banCreate);
  // 3. Prepare updated ban reason and bannedAt timestamp
  const updatedReason = "Updated ban reason";
  const updatedBannedAt = new Date(Date.now() - 1000 * 60 * 60).toISOString(); // 1 hour ago
  // 4. Update ban with new reason, bannedAt and administratorId
  const updateBody: IDiscussionBoardUserBan.IUpdate = {
    reason: updatedReason,
    bannedAt: updatedBannedAt,
    administratorId: superAdmin.id,
    createdAt: banCreate.createdAt,
    updatedAt: new Date().toISOString(),
    deletedAt: null,
  };
  const updatedBan =
    await api.functional.discussionBoard.superAdministrator.administrator.bans.update(
      superAdminConnection,
      {
        banId: banCreate.id,
        body: updateBody,
      },
    );
  typia.assert(updatedBan);
  // 5. Verify that the ban record is updated accordingly
  TestValidator.equals("ban reason updated", updatedBan.reason, updatedReason);
  TestValidator.equals(
    "ban bannedAt updated",
    updatedBan.bannedAt,
    updatedBannedAt,
  );
  TestValidator.equals(
    "ban administratorId updated",
    updatedBan.administratorId,
    superAdmin.id,
  );
  TestValidator.notEquals(
    "ban updatedAt changed",
    updatedBan.updatedAt,
    banCreate.updatedAt,
  );
  // Additional validations for timestamps
  TestValidator.predicate(
    "updatedAt is recent",
    new Date(updatedBan.updatedAt).getTime() >=
      new Date(banCreate.updatedAt).getTime(),
  );
  TestValidator.predicate(
    "createdAt untouched",
    updatedBan.createdAt === banCreate.createdAt,
  );
}
