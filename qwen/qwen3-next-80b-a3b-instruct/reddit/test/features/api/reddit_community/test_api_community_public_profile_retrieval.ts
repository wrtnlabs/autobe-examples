import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_community_public_profile_retrieval(
  connection: api.IConnection,
): Promise<void> {
  const testConnection: api.IConnection = { host: connection.host };
  const communityId = typia.random<string & tags.Format<"uuid">>();
  const response = await api.functional.redditCommunity.communities.at(
    testConnection,
    {
      communityId,
    },
  );
  typia.assert(response);
}
