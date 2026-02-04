import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconomicDiscussionArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionArticle";
import type { IEconomicDiscussionCitizen } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionCitizen";
import type { IEconomicDiscussionSuperAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionSuperAdministrator";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEconomicDiscussionArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEconomicDiscussionArticle";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_administrator_join } from "../../../authorize/authorize_super_administrator_join";
import { authorize_super_administrator_refresh } from "../../../authorize/authorize_super_administrator_refresh";

export async function test_api_most_commented_articles_analytics(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create super administrator connection and authenticate
  const superAdminConnection: api.IConnection = { host: connection.host };
  await authorize_super_administrator_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(12),
      display_name: RandomGenerator.name(),
    } satisfies IEconomicDiscussionSuperAdministrator.IJoin,
  });
  // Step 2: Call the most commented articles analytics endpoint
  const result: IPageIEconomicDiscussionArticle.ISummary =
    await api.functional.economicDiscussion.superAdministrator.admin.analytics.most_commented.index(
      superAdminConnection,
    );
  // Step 3: Validate structure and types
  typia.assert(result);
  // Step 4: Validate pagination metadata
  TestValidator.equals(
    "pagination current page is 1",
    result.pagination.current,
    1,
  );
  TestValidator.predicate(
    "pagination limit is positive",
    result.pagination.limit > 0,
  );
  TestValidator.predicate(
    "pagination records is non-negative",
    result.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages is non-negative",
    result.pagination.pages >= 0,
  );
  // Step 5: Validate articles are ordered by comment_count descending
  // Verify the data array has at least one article
  TestValidator.predicate(
    "at least one article exists",
    result.data.length > 0,
  );
  // Check that comment_count values are in descending order
  for (let i = 0; i < result.data.length - 1; i++) {
    TestValidator.predicate(
      `article ${i} has >= comments than article ${i + 1}`,
      result.data[i].comment_count >= result.data[i + 1].comment_count,
    );
  }
  // Step 6: Validate article summary structure
  // Each article should have title, created_at, id, author, comment_count, and tags
  for (const article of result.data) {
    TestValidator.predicate(
      "article has valid title",
      article.title.length >= 6 && article.title.length <= 200,
    );
    TestValidator.predicate(
      "article has valid created_at",
      new Date(article.created_at).getTime() > 0,
    );
    TestValidator.predicate(
      "article has valid uuid id",
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(
        article.id,
      ),
    );
    TestValidator.predicate(
      "article has author with valid uuid",
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(
        article.author.id,
      ),
    );
    TestValidator.predicate(
      "article has non-negative comment_count",
      article.comment_count >= 0,
    );
    TestValidator.predicate(
      "article has at most 10 tags",
      article.tags.length <= 10,
    );
    for (const tag of article.tags) {
      TestValidator.predicate(
        "each tag is 2-50 characters long",
        tag.length >= 2 && tag.length <= 50,
      );
    }
  }
}
