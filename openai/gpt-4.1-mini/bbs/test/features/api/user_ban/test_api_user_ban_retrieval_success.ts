import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministrator";
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
import { generate_random_discussion_board_administrator_user_bans_create } from "../../../generate/generate_random_discussion_board_administrator_user_bans_create";
import { prepare_random_discussion_board_user_ban } from "../../../prepare/prepare_random_discussion_board_user_ban";

export async function test_api_user_ban_retrieval_success(
  connection: api.IConnection,
): Promise<void> {
  // This test validates successful retrieval of a user ban by its banId.
  // 1. Administrator join and authorize
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_administrator_join(adminConnection, {
    body: {},
  });
  adminConnection.headers ??= {};
  adminConnection.headers.Authorization = adminAuth.token.access;
  // 2. Create a new user ban record using utility function
  const ban =
    await generate_random_discussion_board_administrator_user_bans_create(
      adminConnection,
      { body: {} },
    );
  typia.assert(ban);
  // Access banId with index to avoid TypeScript error
  const banId = (ban as unknown as Record<string, unknown>)["id"];
  if (typeof banId !== "string") {
    throw new Error("Ban id is missing or not a string");
  }
  // 3. Retrieve the user ban record by banId
  const retrievedBan =
    await api.functional.discussionBoard.administrator.userBans.at(
      adminConnection,
      { banId },
    );
  typia.assert(retrievedBan);
  // Access retrievedBan id similarly
  const retrievedBanId = (retrievedBan as unknown as Record<string, unknown>)[
    "id"
  ];
  if (typeof retrievedBanId !== "string") {
    throw new Error("Retrieved ban id is missing or not a string");
  }
  // 4. Validate that retrieved ban id matches the created ban id
  TestValidator.equals(
    "retrieved ban id matches created ban id",
    retrievedBanId,
    banId,
  );
}
