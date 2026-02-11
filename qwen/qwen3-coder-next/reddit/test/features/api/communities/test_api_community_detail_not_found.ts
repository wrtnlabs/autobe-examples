import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import type { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_community_detail_not_found(
  connection: api.IConnection,
): Promise<void> {
  // Use a non-existent community ID (valid UUID format but doesn't exist in database)
  const nonExistentCommunityId = "00000000-0000-0000-0000-000000000000";
  // Attempt to fetch the non-existent community
  const output = await api.functional.redditPlatform.communities.at(
    connection,
    {
      communityId: nonExistentCommunityId,
    },
  );
  // Validate that the response structure is correct even for non-existent community
  typia.assert(output);
}
