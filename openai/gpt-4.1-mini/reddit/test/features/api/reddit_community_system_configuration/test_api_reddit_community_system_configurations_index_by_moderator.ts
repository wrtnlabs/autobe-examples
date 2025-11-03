import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCommunitySystemConfiguration } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunitySystemConfiguration";
import type { IRedditCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityModerator";
import type { IRedditCommunitySystemConfiguration } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunitySystemConfiguration";

export async function test_api_reddit_community_system_configurations_index_by_moderator(
  connection: api.IConnection,
) {
  // 1. Authenticate as a redditCommunity moderator to obtain authorization tokens
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderatorPassword = "TestPassword123!";
  const moderator: IRedditCommunityModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: moderatorEmail,
        password: moderatorPassword,
        ip: null,
        href: "https://example.com/login",
        referrer: "https://example.com/landing",
      } satisfies IRedditCommunityModerator.IJoin,
    });
  typia.assert(moderator);

  // 2. Prepare request body for system configuration list retrieval
  const requestBody = {
    page: 1,
    limit: 10,
    search: "config",
    sortKey: "config_key",
    sortOrder: "asc",
  } satisfies IRedditCommunitySystemConfiguration.IRequest;

  // 3. Retrieve paginated list of system configurations as moderator
  const response: IPageIRedditCommunitySystemConfiguration.ISummary =
    await api.functional.redditCommunity.moderator.redditCommunitySystemConfigurations.index(
      connection,
      {
        body: requestBody,
      },
    );
  typia.assert(response);

  // 4. Validate pagination meta data
  const pagination: IPage.IPagination = response.pagination;
  typia.assert(pagination);
  TestValidator.predicate(
    "pagination.current is positive",
    pagination.current > 0,
  );
  TestValidator.predicate("pagination.limit is positive", pagination.limit > 0);
  TestValidator.predicate(
    "pagination.records is non-negative",
    pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination.pages is non-negative",
    pagination.pages >= 0,
  );

  // 5. Validate list of configuration summaries
  for (const config of response.data) {
    typia.assert(config);
    TestValidator.predicate(
      "config.id is UUID",
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        config.id,
      ),
    );
    TestValidator.predicate(
      "config_key is non-empty string",
      typeof config.config_key === "string" && config.config_key.length > 0,
    );
    TestValidator.predicate(
      "config_value is string",
      typeof config.config_value === "string",
    );
    TestValidator.predicate(
      "description is string or null or undefined",
      config.description === null ||
        config.description === undefined ||
        typeof config.description === "string",
    );
    TestValidator.predicate(
      "created_at is ISO 8601 string",
      /^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}(?:\.[0-9]+)?Z$/.test(
        config.created_at,
      ),
    );
    TestValidator.predicate(
      "updated_at is ISO 8601 string",
      /^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}(?:\.[0-9]+)?Z$/.test(
        config.updated_at,
      ),
    );
  }
}
