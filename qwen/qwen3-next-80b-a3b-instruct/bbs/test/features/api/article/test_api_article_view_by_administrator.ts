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

export async function test_api_article_view_by_administrator(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create a connection for administrator and join
  const adminConnection: api.IConnection = { host: connection.host };
  const adminCredentials = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IEconomicDiscussionAdministrator.IJoin;
  const admin = await authorize_administrator_join(adminConnection, {
    body: adminCredentials,
  });
  typia.assert(admin);
  // Step 2: Create a connection for citizen and join
  const citizenConnection: api.IConnection = { host: connection.host };
  const citizenCredentials = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IEconomicDiscussionCitizen.IJoin;
  const citizen = await authorize_citizen_join(citizenConnection, {
    body: citizenCredentials,
  });
  typia.assert(citizen);
  // Step 3: Citizen creates an article (without section reference, as IEconomicDiscussionArticle.ICreate is empty)
  const article =
    await generate_random_economic_discussion_citizen_articles_create(
      citizenConnection,
      {
        body: {} satisfies IEconomicDiscussionArticle.ICreate,
      },
    );
  typia.assert(article);
  // Step 4: Administrator switches to their connection (already authenticated)
  // Administrator views the article created by citizen
  const viewedArticle = await api.functional.economicDiscussion.articles.at(
    adminConnection,
    { articleId: article.id },
  );
  typia.assert(viewedArticle);
  // Step 5: Validate article content matches expected structure - based on IEconomicDiscussionArticle
  TestValidator.equals("article id matches", viewedArticle.id, article.id);
  TestValidator.equals(
    "article title matches",
    viewedArticle.title,
    article.title,
  );
  TestValidator.equals(
    "article author id matches",
    viewedArticle.author.id,
    citizen.id,
  );
  // Removed validation for display_name as it doesn't exist in ISummary
  TestValidator.equals(
    "article comment count is 0",
    viewedArticle.comment_count,
    0,
  );
  TestValidator.equals(
    "article posted time is valid",
    viewedArticle.posted_time !== null,
    true,
  );
  TestValidator.equals(
    "article tags are empty array",
    viewedArticle.tags.length,
    0,
  );
}
