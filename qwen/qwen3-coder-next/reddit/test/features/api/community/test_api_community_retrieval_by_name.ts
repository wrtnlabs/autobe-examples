import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditLikeCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunity";
import type { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_community_retrieval_by_name(
  connection: api.IConnection,
): Promise<void> {
  // Retrieve community by name using a known community from the test environment
  const communityName = "typescript";
  const community = await api.functional.redditLike.communities.at(connection, {
    name: communityName,
  });
  typia.assert(community);
  // Validate required properties from IRedditLikeCommunity
  TestValidator.predicate(
    "community has valid id format",
    /^[0-9a-f-]{36}$/i.test(community.id),
  );
  TestValidator.predicate(
    "community has name",
    typeof community.name === "string" && community.name.length > 0,
  );
  TestValidator.predicate(
    "subscriber_count is valid",
    community.subscriber_count >= 0,
  );
  TestValidator.predicate("posts_count is valid", community.posts_count >= 0);
  TestValidator.predicate(
    "subscription_count is valid",
    community.subscription_count >= 0,
  );
  TestValidator.predicate(
    "moderatorRole_count is valid",
    community.moderatorRole_count >= 0,
  );
  TestValidator.predicate(
    "userBan_count is valid",
    community.userBan_count >= 0,
  );
  // Validate owner structure
  TestValidator.predicate(
    "owner has valid id format",
    /^[0-9a-f-]{36}$/i.test(community.owner.id),
  );
  TestValidator.predicate(
    "owner has username",
    typeof community.owner.username === "string" &&
      community.owner.username.length > 0,
  );
  TestValidator.predicate(
    "owner has display_name",
    typeof community.owner.display_name === "string",
  );
  TestValidator.predicate(
    "owner has valid karma_score",
    community.owner.karma_score >= 0,
  );
  TestValidator.predicate(
    "created_at is valid date string",
    !isNaN(Date.parse(community.created_at)),
  );
}
