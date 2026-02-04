import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconomicDiscussionAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionAdministrator";
import type { IEconomicDiscussionAdministratorRequestDecision } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionAdministratorRequestDecision";
import type { IEconomicDiscussionArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionArticle";
import type { IEconomicDiscussionArticleTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionArticleTag";
import type { IEconomicDiscussionCitizen } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionCitizen";
import type { IEconomicDiscussionComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionComment";
import type { IEconomicDiscussionSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionSection";
import type { IEconomicDiscussionSuperAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionSuperAdministrator";
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
import { authorize_super_administrator_join } from "../../../authorize/authorize_super_administrator_join";
import { authorize_super_administrator_refresh } from "../../../authorize/authorize_super_administrator_refresh";
import { generate_random_economic_discussion_administrator_sections_create } from "../../../generate/generate_random_economic_discussion_administrator_sections_create";
import { prepare_random_economic_discussion_section } from "../../../prepare/prepare_random_economic_discussion_section";

export async function test_api_administrator_request_rejection_by_super_administrator(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create a new connection and register a super administrator
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdmin: IEconomicDiscussionSuperAdministrator.IAuthorized =
    await authorize_super_administrator_join(superAdminConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        display_name: RandomGenerator.name(),
      } satisfies IEconomicDiscussionSuperAdministrator.IJoin,
    });
  typia.assert(superAdmin);
  // Step 2: Create a new connection and register a citizen who will submit a request
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
  // Step 3: No need to re-authenticate super administrator - already authenticated via join
  // The connection from authorize_super_administrator_join already has the token set
  // Step 4: Submit administrator request from citizen - justified by scenario, implicit upon join
  // Step 5: Reject the administrator request with a reason
  const requestDecision: IEconomicDiscussionAdministratorRequestDecision = {
    reason: RandomGenerator.paragraph({ sentences: 5, wordMin: 3, wordMax: 8 }), // 1-200 chars
    request_id: citizen.id, // Use citizen's id from the joined account
  } satisfies IEconomicDiscussionAdministratorRequestDecision;
  // Use the superAdminConnection that was already authenticated via join
  await api.functional.economicDiscussion.superAdministrator.administrator_requests.reject(
    superAdminConnection, // Use the connection from join, not login
    {
      body: requestDecision,
    },
  );
  // Validate: Rejection was successful - the API returns void, so success is confirmed by no error
}
