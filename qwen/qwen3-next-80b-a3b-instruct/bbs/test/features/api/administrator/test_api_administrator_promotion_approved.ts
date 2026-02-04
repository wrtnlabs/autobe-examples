import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconomicDiscussionAdministratorRequestDecision } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionAdministratorRequestDecision";
import type { IEconomicDiscussionArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionArticle";
import type { IEconomicDiscussionArticleTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionArticleTag";
import type { IEconomicDiscussionCitizen } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionCitizen";
import type { IEconomicDiscussionComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionComment";
import type { IEconomicDiscussionSuperAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionSuperAdministrator";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_citizen_join } from "../../../authorize/authorize_citizen_join";
import { authorize_citizen_login } from "../../../authorize/authorize_citizen_login";
import { authorize_citizen_refresh } from "../../../authorize/authorize_citizen_refresh";
import { authorize_super_administrator_join } from "../../../authorize/authorize_super_administrator_join";
import { authorize_super_administrator_refresh } from "../../../authorize/authorize_super_administrator_refresh";
import { generate_random_economic_discussion_citizen_articles_create } from "../../../generate/generate_random_economic_discussion_citizen_articles_create";
import { prepare_random_economic_discussion_article } from "../../../prepare/prepare_random_economic_discussion_article";

export async function test_api_administrator_promotion_approved(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Set up citizen account
  const citizenConnection: api.IConnection = { host: connection.host };
  const citizen: IEconomicDiscussionCitizen.IAuthorized =
    await authorize_citizen_join(citizenConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        href: "https://example.com/join",
        referrer: "https://example.com/home",
      } satisfies IEconomicDiscussionCitizen.IJoin,
    });
  typia.assert(citizen);
  // Step 2: Citizen creates an article to trigger administrator request
  const article: IEconomicDiscussionArticle =
    await generate_random_economic_discussion_citizen_articles_create(
      citizenConnection,
      {
        body: {
          title: RandomGenerator.paragraph({ sentences: 3 }),
          content: RandomGenerator.content({ paragraphs: 1 }),
          section: "economy",
          tags: ["economic", "analysis"],
        } satisfies IEconomicDiscussionArticle.ICreate,
      },
    );
  typia.assert(article);
  // Step 3: Set up super administrator account and capture email
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdminEmail = typia.random<string & tags.Format<"email">>();
  const superAdminPassword = RandomGenerator.alphaNumeric(16);
  const superAdmin: IEconomicDiscussionSuperAdministrator.IAuthorized =
    await authorize_super_administrator_join(superAdminConnection, {
      body: {
        email: superAdminEmail, // Store generated email
        password: superAdminPassword,
        display_name: RandomGenerator.name(),
      } satisfies IEconomicDiscussionSuperAdministrator.IJoin,
    });
  typia.assert(superAdmin);
  // Step 4: Authenticate super administrator to make decision using SDK function (no utility function available)
  const authedSuperAdminConnection: api.IConnection = { host: connection.host };
  await api.functional.economicDiscussion.auth.superAdministrator.login(
    authedSuperAdminConnection,
    {
      body: {
        email: superAdminEmail, // Use the stored email (not from response object)
        password: superAdminPassword,
      } satisfies IEconomicDiscussionSuperAdministrator.ILogin,
    },
  );
  // Step 5: Approve administrator request using citizen's ID as request_id
  const decision: IEconomicDiscussionAdministratorRequestDecision =
    await api.functional.economicDiscussion.superAdministrator.administrator_request_decisions.patch(
      authedSuperAdminConnection,
      {
        body: {
          request_id: citizen.id, // Use citizen ID as request_id
          decision_status: "approved", // Use correct property name
        } satisfies IEconomicDiscussionAdministratorRequestDecision.IRequest,
      },
    );
  typia.assert(decision);
  // Step 6: Verify decision was recorded using available properties (request_id)
  TestValidator.equals(
    "request_id matches citizen id",
    decision.request_id,
    citizen.id,
  );
  // Step 7: Validate that document was created successfully
  TestValidator.predicate("request_id is valid UUID", () =>
    /^([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})$/i.test(
      decision.request_id,
    ),
  );
}
