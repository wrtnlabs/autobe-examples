import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconomicDiscussionArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionArticle";
import type { IEconomicDiscussionArticleTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionArticleTag";
import type { IEconomicDiscussionCitizen } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionCitizen";
import type { IEconomicDiscussionComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionComment";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_citizen_join } from "../../../authorize/authorize_citizen_join";
import { authorize_citizen_login } from "../../../authorize/authorize_citizen_login";
import { authorize_citizen_refresh } from "../../../authorize/authorize_citizen_refresh";

export async function test_api_citizen_account_registration(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create a new connection for the citizen actor
  const citizenConnection: api.IConnection = { host: connection.host };
  // Step 2: Generate realistic test data using typia.random and RandomGenerator
  // Using typia.random for formatted types according to schema (email, uri)
  // Using RandomGenerator for other string values like password, ip, and href/referrer
  const citizenData = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    ip: null,
    href: `https://${RandomGenerator.alphaNumeric(12)}.io`,
    referrer: `https://${RandomGenerator.alphaNumeric(12)}.com`,
  } satisfies IEconomicDiscussionCitizen.IJoin;
  // Step 3: Use the utility function to register the citizen account
  // Mandatory: use authorize_citizen_join utility function, not direct API call
  const result: IEconomicDiscussionCitizen.IAuthorized =
    await authorize_citizen_join(citizenConnection, { body: citizenData });
  // Step 4: Validate response structure with typia.assert
  typia.assert(result);
  // Step 5: Validate required fields according to schema
  // Check email, id, display_name, bio, tokens, and arrays as specified in IAuthorized
  TestValidator.equals("email format is valid", typeof result.email, "string");
  TestValidator.predicate(
    "id is UUID",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(
      result.id,
    ),
  );
  TestValidator.equals(
    "display_name is string",
    typeof result.display_name,
    "string",
  );
  TestValidator.equals("bio is string", typeof result.bio, "string");
  TestValidator.equals(
    "token access is string",
    typeof result.token.access,
    "string",
  );
  TestValidator.equals(
    "token refresh is string",
    typeof result.token.refresh,
    "string",
  );
  TestValidator.equals(
    "token expired_at is date-time format",
    typeof result.token.expired_at,
    "string",
  );
  TestValidator.equals(
    "token refreshable_until is date-time format",
    typeof result.token.refreshable_until,
    "string",
  );
  // Validate article structure
  TestValidator.predicate(
    "articles array is not null",
    Array.isArray(result.articles),
  );
  if (result.articles.length > 0) {
    TestValidator.equals(
      "article title is string",
      typeof result.articles[0].title,
      "string",
    );
    TestValidator.equals(
      "article posted_time is date-time",
      typeof result.articles[0].posted_time,
      "string",
    );
    TestValidator.predicate(
      "article author id is UUID",
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(
        result.articles[0].author.id,
      ),
    );
    TestValidator.equals(
      "article comment_count is number",
      typeof result.articles[0].comment_count,
      "number",
    );
    TestValidator.predicate(
      "article id is UUID",
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(
        result.articles[0].id,
      ),
    );
  }
  // Validate comment structure
  TestValidator.predicate(
    "comments array is not null",
    Array.isArray(result.comments),
  );
  if (result.comments.length > 0) {
    TestValidator.equals(
      "comment content is string",
      typeof result.comments[0].content,
      "string",
    );
    TestValidator.equals(
      "comment postedTime is string",
      typeof result.comments[0].postedTime,
      "string",
    );
    TestValidator.equals(
      "comment citizen_id is string",
      typeof result.comments[0].economic_discussion_citizen_id,
      "string",
    );
  }
  // Validate token expiration formats
  TestValidator.predicate(
    "expired_at is ISO 8601 date-time",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(
      result.token.expired_at,
    ),
  );
  TestValidator.predicate(
    "refreshable_until is ISO 8601 date-time",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(
      result.token.refreshable_until,
    ),
  );
}