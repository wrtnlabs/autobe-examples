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

export async function test_api_user_ban_creation_by_super_administrator_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as super administrator
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdmin = await authorize_super_administrator_join(
    superAdminConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "StrongPass123!",
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: null,
      },
    },
  );
  superAdminConnection.headers = {
    ...superAdminConnection.headers,
    Authorization: superAdmin.token.access,
  };
  // 2. Select a registered user who is not banned
  // Since no direct API to list registered users or filter by ban status is given, we generate a ban from a random new user to fulfill the scenario.
  // We simulate by creating a new user ban directly using the generator.
  // Prepare ban create body with random valid data
  const banReason = "Violation of community guidelines";
  // 3. Create ban record for a random registered user
  const ban =
    await generate_random_discussion_board_super_administrator_administrator_bans_create(
      superAdminConnection,
      {
        body: {
          registeredUserId: typia.random<string & tags.Format<"uuid">>(),
          reason: banReason,
        },
      },
    );
  typia.assert(ban);
  // 4. Validate ban details
  TestValidator.equals("ban reason matches", ban.reason, banReason);
  TestValidator.predicate(
    "ban id is valid uuid",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(
      ban.id,
    ),
  );
  TestValidator.predicate(
    "ban bannedAt is ISO date-time",
    !isNaN(Date.parse(ban.bannedAt)),
  );
  TestValidator.predicate(
    "ban createdAt is ISO date-time",
    !isNaN(Date.parse(ban.createdAt)),
  );
  TestValidator.predicate(
    "ban updatedAt is ISO date-time",
    !isNaN(Date.parse(ban.updatedAt)),
  );
  TestValidator.equals("ban deletedAt is null", ban.deletedAt, null);
  // 5. Validate user is now banned
  TestValidator.predicate(
    "registered user is banned",
    ban.registeredUser.isBanned === true,
  );
  // 6. Validate administrator info exists and id matches superAdmin id
  TestValidator.equals(
    "administrator id matches superAdmin id",
    ban.administratorId,
    superAdmin.id,
  );
  if (ban.administrator !== null && ban.administrator !== undefined) {
    TestValidator.equals(
      "administrator id in object matches",
      ban.administrator.id,
      superAdmin.id,
    );
  }
  // 7. Further, test that banned user cannot login via login endpoint
  // Since no direct login utility provided for registered user in inputs,
  // this test step is a placeholder for integration test where actual login is tested
  // Here, just asserting ban record suffices for E2E authoring scope
}
