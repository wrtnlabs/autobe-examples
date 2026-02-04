import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconomicDiscussionAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionAdministrator";
import type { IEconomicDiscussionArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionArticle";
import type { IEconomicDiscussionArticleTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionArticleTag";
import type { IEconomicDiscussionBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionBan";
import type { IEconomicDiscussionCitizen } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionCitizen";
import type { IEconomicDiscussionComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionComment";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEconomicDiscussionBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEconomicDiscussionBan";
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

export async function test_api_administrator_ban_list_access_denial(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create an administrator account using join operation
  const adminConnection: api.IConnection = { host: connection.host };
  const admin: IEconomicDiscussionAdministrator.IAuthorized =
    await authorize_administrator_join(adminConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IEconomicDiscussionAdministrator.IJoin,
    });
  typia.assert(admin);
  // Step 2: Create a citizen account using join operation
  const citizenConnection: api.IConnection = { host: connection.host };
  const citizen: IEconomicDiscussionCitizen.IAuthorized =
    await authorize_citizen_join(citizenConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IEconomicDiscussionCitizen.IJoin,
    });
  typia.assert(citizen);
  // Step 3: Verify administrator can access the ban list (positive test)
  const adminBanList: IPageIEconomicDiscussionBan.ISummary =
    await api.functional.economicDiscussion.administrator.bans.get(
      adminConnection,
    );
  typia.assert(adminBanList);
  // Step 4: Verify citizen is denied access to the ban list (negative test)
  await TestValidator.error(
    "citizen should be denied access to administrator ban list",
    async () => {
      await api.functional.economicDiscussion.administrator.bans.get(
        citizenConnection,
      );
    },
  );
}
