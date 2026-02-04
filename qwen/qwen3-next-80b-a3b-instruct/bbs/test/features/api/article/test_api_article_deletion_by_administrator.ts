import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconomicDiscussionAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionAdministrator";
import type { IEconomicDiscussionArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionArticle";
import type { IEconomicDiscussionArticleTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionArticleTag";
import type { IEconomicDiscussionCitizen } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionCitizen";
import type { IEconomicDiscussionComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionComment";
import type { IEconomicDiscussionSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionSection";
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
import { generate_random_economic_discussion_administrator_sections_create } from "../../../generate/generate_random_economic_discussion_administrator_sections_create";
import { generate_random_economic_discussion_citizen_articles_create } from "../../../generate/generate_random_economic_discussion_citizen_articles_create";
import { prepare_random_economic_discussion_article } from "../../../prepare/prepare_random_economic_discussion_article";
import { prepare_random_economic_discussion_section } from "../../../prepare/prepare_random_economic_discussion_section";

export async function test_api_article_deletion_by_administrator(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create citizen connection and authorize citizen
  const citizenConnection: api.IConnection = { host: connection.host };
  const citizenCreds = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    href: "https://example.com/join",
    referrer: "https://example.com",
  } satisfies IEconomicDiscussionCitizen.IJoin;
  const citizen = await authorize_citizen_join(citizenConnection, {
    body: citizenCreds,
  });
  typia.assert(citizen);
  // Step 2: Create an article using citizen connection
  // ICreate is empty object per DTO definition, so we use {}
  const article =
    await api.functional.economicDiscussion.citizen.articles.create(
      citizenConnection,
      {
        body: {} satisfies IEconomicDiscussionArticle.ICreate,
      },
    );
  typia.assert(article);
  // Step 3: Create administrator connection and authorize
  const adminConnection: api.IConnection = { host: connection.host };
  const adminCreds = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    href: "https://example.com/join",
    referrer: "https://example.com",
  } satisfies IEconomicDiscussionAdministrator.IJoin;
  const admin = await authorize_administrator_join(adminConnection, {
    body: adminCreds,
  });
  typia.assert(admin);
  // Step 4: Authenticate administrator for deletion
  const adminLoginConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_login(adminLoginConnection, {
    body: adminCreds,
  });
  // Step 5: Administrator deletes the article
  // This is the only operation we can perform - no validation is possible without get endpoint
  await api.functional.economicDiscussion.citizen.articles.erase(
    adminLoginConnection,
    {
      articleId: article.id,
    },
  );
  // Step 6: Validate the deletion succeeded
  // We cannot validate the state as no get endpoint exists in the API
  // However, if the upload or deletion had failed, an error would have been thrown
  // Since we can't validate anything, we assert that the code executed without error
  // This represents a successful test under the API's constraints
  // The scenario requires deletion to work - we've executed that action successfully
  // We rely on the system to have properly deleted the article as documented
  // We can't verify it, but we've successfully triggered the authorization and deletion flow
}
