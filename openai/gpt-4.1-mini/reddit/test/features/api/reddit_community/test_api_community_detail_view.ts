import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";

export async function test_api_community_detail_view(
  connection: api.IConnection,
) {
  // Valid community name - expecting full community data
  const validCommunityName = "validCommunity";
  const community: IRedditCommunityCommunity =
    await api.functional.redditCommunity.communities.at(connection, {
      communityName: validCommunityName,
    });
  typia.assert(community);
  TestValidator.predicate("id is non-empty string", community.id.length > 0);
  TestValidator.equals(
    "name matches requested community",
    community.name,
    validCommunityName,
  );
  TestValidator.predicate(
    "created_at is valid ISO date-time",
    !isNaN(Date.parse(community.created_at)),
  );
  TestValidator.predicate(
    "updated_at is valid ISO date-time",
    !isNaN(Date.parse(community.updated_at)),
  );

  // description and deleted_at are nullable
  TestValidator.predicate(
    "description is string or null",
    community.description === null || typeof community.description === "string",
  );
  if (community.deleted_at !== null && community.deleted_at !== undefined) {
    TestValidator.predicate(
      "deleted_at is valid ISO date-time",
      !isNaN(Date.parse(community.deleted_at)),
    );
  }

  // Non-existent community should error
  await TestValidator.error("non-existent community throws error", async () => {
    await api.functional.redditCommunity.communities.at(connection, {
      communityName: "community_does_not_exist_12345",
    });
  });

  // Soft deleted community throws error
  await TestValidator.error("soft deleted community throws error", async () => {
    await api.functional.redditCommunity.communities.at(connection, {
      communityName: "soft_deleted_community",
    });
  });
}
