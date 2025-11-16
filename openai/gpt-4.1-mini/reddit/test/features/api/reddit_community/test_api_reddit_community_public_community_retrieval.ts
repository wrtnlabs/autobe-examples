import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";

export async function test_api_reddit_community_public_community_retrieval(
  connection: api.IConnection,
) {
  // Test public access to reddit community by unique communityName
  // Attempt fetching with several random community names
  const communityNames = [
    RandomGenerator.alphabets(10),
    RandomGenerator.alphabets(12),
    RandomGenerator.alphabets(8),
  ];

  for (const name of communityNames) {
    const response: IRedditCommunityCommunity =
      await api.functional.redditCommunity.communities.at(connection, {
        communityName: name,
      });
    typia.assert(response);
    TestValidator.predicate(
      `communityName is string: ${name}`,
      typeof response.communityName === "string",
    );
    TestValidator.equals(
      `communityName matches requested: ${name}`,
      response.communityName,
      name,
    );
    TestValidator.predicate(
      `status is 'active' or 'inactive'`,
      response.status === "active" || response.status === "inactive",
    );
    TestValidator.predicate(
      `id is string and has length 36`,
      typeof response.id === "string" && response.id.length === 36,
    );
    TestValidator.predicate(
      `created_at is string and ISO format`,
      typeof response.created_at === "string",
    );
    TestValidator.predicate(
      `updated_at is string and ISO format`,
      typeof response.updated_at === "string",
    );
    if (response.deleted_at !== null && response.deleted_at !== undefined) {
      TestValidator.predicate(
        `deleted_at is string or null`,
        typeof response.deleted_at === "string" || response.deleted_at === null,
      );
    }
    TestValidator.predicate(
      `creator_id is string and has length 36`,
      typeof response.creator_id === "string" &&
        response.creator_id.length === 36,
    );
  }
}
