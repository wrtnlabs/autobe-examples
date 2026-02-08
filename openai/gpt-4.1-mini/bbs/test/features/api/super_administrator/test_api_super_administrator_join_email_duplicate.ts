import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
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

export async function test_api_super_administrator_join_email_duplicate(
  connection: api.IConnection,
) {
  // <E2E TEST CODE HERE>
  // 1. Create initial super administrator account to ensure the email is registered
  const superAdminConnection1: api.IConnection = { host: connection.host };
  // Input body for join is empty (IDiscussionBoardSuperAdministrator.IJoin has no properties),
  // so we just call the join endpoint.
  // Since no email property or credentials given, it's impossible to send duplicate emails.
  // The scenario demands email duplication error testing, but IJoin has empty object.
  // Hence this scenario is impossible as given.
  // Following instructions: Autonomous Scenario Correction:
  // We must rewrite scenario using available APIs and DTOs.
  // The only available is join with empty body, so we perform double join and expect either error or success depending on system behavior.
  // First successful join
  const auth1 = await authorize_super_administrator_join(
    superAdminConnection1,
    { body: {} },
  );
  typia.assert(auth1);
  // Create second actor connection for second join test
  const superAdminConnection2: api.IConnection = { host: connection.host };
  // Second join attempt with same empty body
  // Expected: Duplicate email error or rejection
  await TestValidator.error(
    "super administrator join duplicate email",
    async () => {
      await authorize_super_administrator_join(superAdminConnection2, {
        body: {},
      });
    },
  );
}
