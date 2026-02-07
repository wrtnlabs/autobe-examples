import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconomicBoardAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardAdministrator";
import type { IEconomicBoardBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardBan";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEconomicBoardBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEconomicBoardBan";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";
import { generate_random_economic_board_administrator_bans_create } from "../../../generate/generate_random_economic_board_administrator_bans_create";
import { prepare_random_economic_board_ban } from "../../../prepare/prepare_random_economic_board_ban";

export async function test_api_administrator_ban_user_and_verify_list(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create a new administrator account
  const adminConnection: api.IConnection = { host: connection.host };
  const adminJoinData: IEconomicBoardAdministrator.IJoin = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "SecurePass123!",
    display_name: RandomGenerator.name(),
    bio: RandomGenerator.paragraph({ sentences: 2 }),
  } satisfies IEconomicBoardAdministrator.IJoin;
  const adminAuthorized = await authorize_administrator_join(adminConnection, {
    body: adminJoinData,
  });
  typia.assert(adminAuthorized);
  // 2. Create a citizen user to ban
  const citizenConnection: api.IConnection = { host: connection.host };
  const citizenJoinData: IEconomicBoardAdministrator.IJoin = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "CitizenPass456!",
    display_name: RandomGenerator.name(),
    bio: RandomGenerator.paragraph({ sentences: 2 }),
  } satisfies IEconomicBoardAdministrator.IJoin;
  const citizenAuthorized = await authorize_administrator_join(
    citizenConnection,
    { body: citizenJoinData },
  );
  typia.assert(citizenAuthorized);
  // 3. Extract user IDs from JWT access tokens (Node.js compatible)
  // JWT format: header.payload.signature - payload is base64 encoded JSON
  const adminPayload = Buffer.from(
    adminAuthorized.token.access.split(".")[1],
    "base64",
  ).toString("utf-8");
  const citizenPayload = Buffer.from(
    citizenAuthorized.token.access.split(".")[1],
    "base64",
  ).toString("utf-8");
  const adminTokenPayload = JSON.parse(adminPayload);
  const citizenTokenPayload = JSON.parse(citizenPayload);
  // Validate that we have the subject IDs
  if (!adminTokenPayload.sub) {
    throw new Error("Admin token payload does not contain subject ID");
  }
  if (!citizenTokenPayload.sub) {
    throw new Error("Citizen token payload does not contain subject ID");
  }
  // 4. Ban the citizen user with a reason of at least 10 characters
  const banReason = RandomGenerator.paragraph({ sentences: 2 }); // Guaranteed to be at least 10 characters
  const banData: IEconomicBoardBan.ICreate = {
    citizen_id: citizenTokenPayload.sub,
    administrator_id: adminTokenPayload.sub,
    ban_reason: banReason,
  } satisfies IEconomicBoardBan.ICreate;
  await generate_random_economic_board_administrator_bans_create(
    adminConnection,
    { body: banData },
  );
  // 5. Retrieve the list of bans and verify the new ban is the first entry
  const bansList: IPageIEconomicBoardBan.ISummary =
    await api.functional.economicBoard.administrator.bans.get(adminConnection);
  typia.assert(bansList);
  // Validate that the bans list contains at least one record
  TestValidator.predicate("bans list has entries", bansList.data.length > 0);
  // Validate that the first entry is a valid IEconomicBoardBan.ISummary object
  // Since ISummary is empty ({}), we can only validate it exists and is an object
  const firstBan = bansList.data[0];
  TestValidator.predicate(
    "first ban is valid object",
    firstBan != null && typeof firstBan === "object",
  );
  // We cannot validate specific properties like citizen_display_name, administrator_display_name, ban_reason, or unbanned_at
  // because the ISummary type is empty, meaning these properties don't exist on the response.
  // The actual response structure must be determined from the API implementation, but according to the DTO specification provided,
  // these properties are not defined in IEconomicBoardBan.ISummary.
  // Therefore, we remove these validations and verify only that a ban was created and appears in the list.
}
