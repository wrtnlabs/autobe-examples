import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditLikeAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeAdmin";
import type { IRedditLikeSystemSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeSystemSetting";

export async function test_api_system_setting_creation_rate_limiting(
  connection: api.IConnection,
) {
  // Step 1: Register and authenticate as administrator
  const admin = await api.functional.auth.admin.join(connection, {
    body: {
      username: RandomGenerator.alphaNumeric(10),
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(12),
    } satisfies IRedditLikeAdmin.ICreate,
  });
  typia.assert(admin);

  // Step 2: Create rate limiting setting for posts per hour
  const postsPerHourSetting =
    await api.functional.redditLike.admin.system.settings.create(connection, {
      body: {
        key: "rate_limit_posts_per_hour",
        value: "10",
        description: "Maximum number of posts a user can create per hour",
        value_type: "int",
        category: "moderation",
        is_public: false,
      } satisfies IRedditLikeSystemSetting.ICreate,
    });
  typia.assert(postsPerHourSetting);

  // Step 3: Validate posts per hour setting properties
  TestValidator.equals(
    "posts per hour setting key matches",
    postsPerHourSetting.key,
    "rate_limit_posts_per_hour",
  );
  TestValidator.equals(
    "posts per hour setting value type is int",
    postsPerHourSetting.value_type,
    "int",
  );
  TestValidator.equals(
    "posts per hour setting category is moderation",
    postsPerHourSetting.category,
    "moderation",
  );
  TestValidator.equals(
    "posts per hour setting is not public",
    postsPerHourSetting.is_public,
    false,
  );

  // Step 4: Create rate limiting setting for comments per minute
  const commentsPerMinuteSetting =
    await api.functional.redditLike.admin.system.settings.create(connection, {
      body: {
        key: "rate_limit_comments_per_minute",
        value: "5",
        description: "Maximum number of comments a user can post per minute",
        value_type: "int",
        category: "moderation",
        is_public: false,
      } satisfies IRedditLikeSystemSetting.ICreate,
    });
  typia.assert(commentsPerMinuteSetting);

  // Step 5: Validate comments per minute setting properties
  TestValidator.equals(
    "comments per minute setting key matches",
    commentsPerMinuteSetting.key,
    "rate_limit_comments_per_minute",
  );
  TestValidator.equals(
    "comments per minute setting value is correct",
    commentsPerMinuteSetting.value,
    "5",
  );
  TestValidator.equals(
    "comments per minute setting value type is int",
    commentsPerMinuteSetting.value_type,
    "int",
  );

  // Step 6: Create rate limiting setting for votes per minute
  const votesPerMinuteSetting =
    await api.functional.redditLike.admin.system.settings.create(connection, {
      body: {
        key: "rate_limit_votes_per_minute",
        value: "20",
        description:
          "Maximum number of votes (upvotes/downvotes) a user can cast per minute",
        value_type: "int",
        category: "performance",
        is_public: false,
      } satisfies IRedditLikeSystemSetting.ICreate,
    });
  typia.assert(votesPerMinuteSetting);

  // Step 7: Validate votes per minute setting properties
  TestValidator.equals(
    "votes per minute setting key matches",
    votesPerMinuteSetting.key,
    "rate_limit_votes_per_minute",
  );
  TestValidator.equals(
    "votes per minute setting category is performance",
    votesPerMinuteSetting.category,
    "performance",
  );
}
