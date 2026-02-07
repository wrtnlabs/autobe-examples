import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformCommunity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_community_description_search(
  connection: api.IConnection,
): Promise<void> {
  // Create community with description containing special characters
  const specialCharsDesc =
    'Community description with special characters: " \' , ; $ % & * () _ + = [ ] { } : " \\ / ? @ # ^ < >';
  const communityName = RandomGenerator.name();
  // Perform search operation with empty request (since IRequest is empty)
  const searchQuery = "special characters";
  const result = await api.functional.communityPlatform.communities.index(
    connection,
    {
      body: {} satisfies ICommunityPlatformCommunity.IRequest,
    },
  );
  typia.assert(result);
  // Validate search returns matching community
  const foundCommunity = result.data.find((comm) =>
    comm.description?.includes(searchQuery),
  );
  TestValidator.equals(
    "search result should contain community with special characters",
    !!foundCommunity,
    true,
  );
  // Validate pagination information
  TestValidator.equals(
    "pagination should have records",
    result.pagination.records > 0,
    true,
  );
  TestValidator.equals(
    "current page should be 1",
    result.pagination.current,
    1,
  );
  TestValidator.equals(
    "records count matches data length",
    result.pagination.records,
    result.data.length,
  );
  // Validate community summary fields
  TestValidator.equals(
    "community name should exist",
    !!foundCommunity?.name,
    true,
  );
  TestValidator.equals(
    "community description should contain search query",
    foundCommunity?.description?.includes(searchQuery),
    true,
  );
  TestValidator.equals(
    "community owner should exist",
    !!foundCommunity?.owner,
    true,
  );
}
