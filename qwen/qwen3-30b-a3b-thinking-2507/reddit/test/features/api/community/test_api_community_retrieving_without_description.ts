import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_community_retrieving_without_description(
  connection: api.IConnection,
): Promise<void> {
  const communityId = typia.random<string & tags.Format<"uuid">>();
  const community = await api.functional.communityPlatform.communities.at(
    connection,
    { communityId },
  );
  typia.assert(community);
  TestValidator.equals(
    "Description should be null",
    community.description,
    null,
  );
}
