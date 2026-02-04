import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconomicDiscussionAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionAdministrator";
import type { IEconomicDiscussionArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionArticle";
import type { IEconomicDiscussionArticleTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionArticleTag";
import type { IEconomicDiscussionBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionBan";
import type { IEconomicDiscussionCitizen } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionCitizen";
import type { IEconomicDiscussionComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionComment";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";
import { authorize_citizen_join } from "../../../authorize/authorize_citizen_join";
import { authorize_citizen_login } from "../../../authorize/authorize_citizen_login";
import { authorize_citizen_refresh } from "../../../authorize/authorize_citizen_refresh";
import { generate_random_economic_discussion_administrator_bans_create } from "../../../generate/generate_random_economic_discussion_administrator_bans_create";
import { prepare_random_economic_discussion_ban } from "../../../prepare/prepare_random_economic_discussion_ban";

export async function test_api_citizen_token_refresh_banned_account(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create a citizen account
  const citizenConnection: api.IConnection = { host: connection.host };
  const citizenData = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    href: "https://example.com/join",
    referrer: "https://example.com/home",
  } satisfies IEconomicDiscussionCitizen.IJoin;
  const citizen = await authorize_citizen_join(citizenConnection, {
    body: citizenData,
  });
  typia.assert(citizen);
  // Step 2: Create an administrator account
  const adminConnection: api.IConnection = { host: connection.host };
  const adminData = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    href: "https://example.com/admin/join",
    referrer: "https://example.com/admin",
  } satisfies IEconomicDiscussionAdministrator.IJoin;
  const admin = await authorize_administrator_join(adminConnection, {
    body: adminData,
  });
  typia.assert(admin);
  // Step 3: Login as administrator
  const adminLoginConnection: api.IConnection = { host: connection.host };
  const adminLoginData = {
    email: adminData.email,
    password: adminData.password,
  } satisfies IEconomicDiscussionAdministrator.ILogin;
  await authorize_administrator_login(adminLoginConnection, {
    body: adminLoginData,
  });
  // Step 4: Ban the citizen account
  await generate_random_economic_discussion_administrator_bans_create(
    adminLoginConnection,
    {
      params: {
        userId: citizen.id,
      },
      body: {},
    },
  );
  // Step 5: Login as citizen to obtain refresh token
  const citizenLoginConnection: api.IConnection = { host: connection.host };
  const citizenLoginData = {
    email: citizenData.email,
    password: citizenData.password,
  } satisfies IEconomicDiscussionCitizen.ILogin;
  const citizenAuthorized = await authorize_citizen_login(
    citizenLoginConnection,
    { body: citizenLoginData },
  );
  typia.assert(citizenAuthorized);
  // Step 6: Attempt token refresh with banned account - must fail
  await TestValidator.error(
    "token refresh should fail for banned citizen account",
    async () => {
      const refreshData = {
        refreshToken: citizenAuthorized.token.refresh,
      } satisfies IEconomicDiscussionCitizen.IRefresh;
      await authorize_citizen_refresh(connection, { body: refreshData });
    },
  );
}
