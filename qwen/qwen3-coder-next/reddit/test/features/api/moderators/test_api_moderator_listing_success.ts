import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCloneCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCloneCommunityModerator";
import type { IRedditCloneCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunity";
import type { IRedditCloneCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunityModerator";
import type { IRedditCloneModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneModerator";
import type { IRedditCloneOwner } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneOwner";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_moderator_listing_success(
  connection: api.IConnection,
): Promise<void> {
  // Test successful moderator listing
  const communityId = typia.random<string & tags.Format<"uuid">>();
  const result = await api.functional.redditClone.communities.moderators.index(
    connection,
    {
      communityId: communityId,
    },
  );
  typia.assert(result!);
  // Validate results
  TestValidator.equals("pagination exists", result.pagination.current, 1);
  TestValidator.equals("has 1 moderator", result.data.length, 1);
  TestValidator.equals(
    "moderator matches",
    result.data[0].moderator_id,
    result.data[0].moderator_id,
  );
  TestValidator.predicate(
    "has community info",
    typeof result.data[0].community.id === "string",
  );
  TestValidator.predicate(
    "has moderator info",
    typeof result.data[0].moderator.id === "string",
  );
  TestValidator.predicate(
    "has appointer info",
    typeof result.data[0].appointer.id === "string",
  );
  // Test pagination parameters
  const paginatedResult =
    await api.functional.redditClone.communities.moderators.index(connection, {
      communityId: communityId,
    });
  typia.assert(paginatedResult!);
  TestValidator.equals(
    "pagination structure valid",
    typeof paginatedResult.pagination.limit,
    "number",
  );
  TestValidator.equals(
    "pagination structure valid",
    typeof paginatedResult.pagination.records,
    "number",
  );
  TestValidator.equals(
    "pagination structure valid",
    typeof paginatedResult.pagination.pages,
    "number",
  );
}
