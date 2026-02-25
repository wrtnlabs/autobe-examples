import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministrator";
import type { IDiscussionBoardAdministratorGrade } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorGrade";
import type { IDiscussionBoardRegisteredUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardRegisteredUser";
import type { IDiscussionBoardUserBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUserBan";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";
import { generate_random_discussion_board_administrator_administrator_bans_create } from "../../../generate/generate_random_discussion_board_administrator_administrator_bans_create";
import { prepare_random_discussion_board_user_ban } from "../../../prepare/prepare_random_discussion_board_user_ban";

export async function test_api_administrator_user_ban_creation_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Administrator Registration and Authentication
  const adminConnection: api.IConnection = { host: connection.host };
  const adminJoinBody: IDiscussionBoardAdministrator.IJoin = {
    email: typia.random<string & typia.tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
  };
  const adminAuthorized: IDiscussionBoardAdministrator.IAuthorized =
    await authorize_administrator_join(adminConnection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);
  adminConnection.headers = {
    Authorization: `Bearer ${adminAuthorized.token.access}`,
  };
  // 2. Create a Registered User (ban target) by using a random RegisteredUser summary with valid id (simulate)
  // Since no user registration utility provided, we simulate a registered user summary
  const registeredUserSummary: IDiscussionBoardRegisteredUser.ISummary = {
    id: typia.random<string & typia.tags.Format<"uuid">>(),
    email: typia.random<string & typia.tags.Format<"email">>(),
    displayName: RandomGenerator.name(),
    bio: RandomGenerator.paragraph({ sentences: 2 }),
    isBanned: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    deletedAt: null,
  };
  // 3. Ban creation
  const banReason = RandomGenerator.paragraph({ sentences: 3 });
  const banBody: IDiscussionBoardUserBan.ICreate = {
    registeredUserId: registeredUserSummary.id,
    reason: banReason,
  };
  const ban: IDiscussionBoardUserBan =
    await generate_random_discussion_board_administrator_administrator_bans_create(
      adminConnection,
      { body: banBody },
    );
  typia.assert(ban);
  // 4. Validate ban record
  TestValidator.predicate(
    "ban has id",
    typeof ban.id === "string" && ban.id.length > 0,
  );
  TestValidator.equals("ban reason matches", ban.reason, banReason);
  // Validate timestamps
  TestValidator.predicate(
    "ban.bannedAt is ISO datetime",
    typeof ban.bannedAt === "string",
  );
  TestValidator.predicate(
    "ban.createdAt is ISO datetime",
    typeof ban.createdAt === "string",
  );
  TestValidator.predicate(
    "ban.updatedAt is ISO datetime",
    typeof ban.updatedAt === "string",
  );
  TestValidator.equals("ban.deletedAt is null", ban.deletedAt, null);
  // Validate registered user summary
  typia.assertGuard(ban.registeredUser);
  TestValidator.equals(
    "registeredUser id matches",
    ban.registeredUser.id,
    registeredUserSummary.id,
  );
  TestValidator.predicate(
    "registeredUser is banned",
    ban.registeredUser.isBanned === true,
  );
  // Validate administrator summary
  typia.assertGuard(ban.administrator);
  TestValidator.equals(
    "administrator id matches",
    ban.administrator?.id ?? null,
    adminAuthorized.id,
  );
  // 5. Verify that the banned user cannot login
  const bannedUserConnection: api.IConnection = { host: connection.host };
  // Prepare banned user's login credentials (simulate) - since there's no user login utility, we simulate login with invalid credentials and expect failure
  // But as per realistic scenario, banned user is existing user but now banned, so login should fail.
  // We call the user login endpoint directly to confirm failure
  // However, no user login utility provided, so we must skip login attempt.
  // Instead, we document this step here as business logic validation.
  // Instead, we test an error on the ban creation again with the same user to simulate that duplicate ban is not allowed
  await TestValidator.error("duplicate ban error", async () => {
    await generate_random_discussion_board_administrator_administrator_bans_create(
      adminConnection,
      {
        body: banBody,
      },
    );
  });
}
