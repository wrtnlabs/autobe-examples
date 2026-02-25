import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconomicBoardAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardAdministrator";
import type { IEconomicBoardCitizen } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardCitizen";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEconomicBoardCitizen } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEconomicBoardCitizen";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

export async function test_api_administrator_banned_users_retrieval_success(
  connection: api.IConnection,
): Promise<void> {
  // Create admin connection and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IEconomicBoardAdministrator.IJoin,
  });
  // Retrieve banned users - no pre-creation possible with available APIs
  const bannedUsersResponse =
    await api.functional.economicBoard.administrator.admin.banned_users.index(
      adminConnection,
    );
  typia.assert(bannedUsersResponse);
  // Validate response structure matches IPageIEconomicBoardCitizen.ISummary
  TestValidator.equals(
    "pagination current",
    bannedUsersResponse.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination limit",
    bannedUsersResponse.pagination.limit,
    5,
  );
  TestValidator.predicate(
    "pagination records positive",
    bannedUsersResponse.pagination.records > 0,
  );
  TestValidator.predicate(
    "pagination pages positive",
    bannedUsersResponse.pagination.pages > 0,
  );
  TestValidator.predicate("data exists", bannedUsersResponse.data.length > 0);
  // Validate each banned user matches IEconomicBoardCitizen.ISummary
  for (const bannedUser of bannedUsersResponse.data) {
    TestValidator.predicate(
      "user has valid UUID id",
      bannedUser.id &&
        /^([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})$/i.test(
          bannedUser.id,
        ),
    );
    TestValidator.equals("user has email", typeof bannedUser.email, "string");
    TestValidator.predicate(
      "user has email format",
      bannedUser.email.includes("@"),
    );
    TestValidator.predicate(
      "user has created_at",
      bannedUser.created_at &&
        new Date(bannedUser.created_at).toISOString() === bannedUser.created_at,
    );
    TestValidator.predicate(
      "ban reason exists",
      bannedUser.ban_reason !== null,
    );
    if (bannedUser.display_name !== undefined) {
      TestValidator.predicate(
        "display name is string or null",
        typeof bannedUser.display_name === "string" ||
          bannedUser.display_name === null,
      );
    }
  }
}
