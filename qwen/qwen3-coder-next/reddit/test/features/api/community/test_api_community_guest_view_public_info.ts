import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditLikeCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunity";
import type { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_community_guest_view_public_info(
  connection: api.IConnection,
): Promise<void> {
  // 1. Prepare public community data
  const communityName = "test_public_community";
  const community = await api.functional.redditLike.communities.at(connection, {
    name: communityName,
  });
  typia.assert(community);
  // 2. Guest views community page (no authentication)
  const output = await api.functional.redditLike.communities.at(
    { host: connection.host },
    { name: communityName },
  );
  typia.assert(output);
  // 3. Validate public information
  TestValidator.equals("community name matches", output.name, communityName);
  TestValidator.predicate("has valid ID", /^[0-9a-f-]{36}$/i.test(output.id));
  TestValidator.predicate(
    "has valid icon URL",
    output.icon_url === null || typeof output.icon_url === "string",
  );
  TestValidator.predicate(
    "has valid created_at",
    !isNaN(Date.parse(output.created_at)),
  );
  TestValidator.predicate(
    "has valid updated_at",
    !isNaN(Date.parse(output.updated_at)),
  );
  TestValidator.predicate(
    "subscriber_count is non-negative",
    output.subscriber_count >= 0,
  );
  // 4. Validate owner summary
  if (output.owner) {
    TestValidator.equals("owner has ID", typeof output.owner.id, "string");
    TestValidator.equals(
      "owner has username",
      typeof output.owner.username,
      "string",
    );
    TestValidator.equals(
      "owner has display_name",
      typeof output.owner.display_name,
      "string",
    );
    TestValidator.predicate(
      "owner karma_score is numeric",
      typeof output.owner.karma_score === "number",
    );
    TestValidator.predicate(
      "owner created_at is valid",
      !isNaN(Date.parse(output.owner.created_at)),
    );
  }
  // 5. Validate counts
  TestValidator.predicate(
    "posts_count is non-negative",
    output.posts_count >= 0,
  );
  TestValidator.predicate(
    "subscription_count is non-negative",
    output.subscription_count >= 0,
  );
  TestValidator.predicate(
    "moderatorRole_count is non-negative",
    output.moderatorRole_count >= 0,
  );
  TestValidator.predicate(
    "userBan_count is non-negative",
    output.userBan_count >= 0,
  );
  // 6. Test error handling for non-existent community
  await TestValidator.error("non-existent community throws error", async () => {
    await api.functional.redditLike.communities.at(
      { host: connection.host },
      { name: "nonexistent_community_xyz" },
    );
  });
}
