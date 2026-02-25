import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardDemotionResult } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardDemotionResult";
import type { IDiscussionBoardSuperAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdministrator";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_administrator_join } from "../../../authorize/authorize_super_administrator_join";
import { authorize_super_administrator_login } from "../../../authorize/authorize_super_administrator_login";
import { authorize_super_administrator_refresh } from "../../../authorize/authorize_super_administrator_refresh";

export async function test_api_administrator_demote_super_administrator_success(
  connection: api.IConnection,
): Promise<void> {
  // This scenario tests the successful demotion of a super administrator to a regular administrator by another super administrator.
  // 1. Authenticate the first super administrator
  const superAdminConnection: api.IConnection = { host: connection.host };
  // Use authorize_super_administrator_join to create and login a super administrator
  const superAdmin = await authorize_super_administrator_join(
    superAdminConnection,
    {},
  );
  // 2. Authenticate the target super administrator to be demoted
  const targetSuperAdminConnection: api.IConnection = { host: connection.host };
  // Signup a different super admin which will be demoted
  const targetSuperAdmin = await authorize_super_administrator_join(
    targetSuperAdminConnection,
    {},
  );
  // 3. Demote the target super administrator by the first super administrator
  const demotionResult =
    await api.functional.discussionBoard.superAdministrator.administrator.demote.demoteAdministrator(
      superAdminConnection,
      { administratorId: targetSuperAdmin.id },
    );
  typia.assert(demotionResult);
  // 4. Validate that demotion succeeded
  TestValidator.predicate("demotion success", demotionResult.success === true);
  // 5. Optionally validate message contents if any
  if (demotionResult.message !== undefined && demotionResult.message !== null) {
    TestValidator.predicate(
      "demotion message non-empty or valid",
      demotionResult.message.length > 0,
    );
  }
}
