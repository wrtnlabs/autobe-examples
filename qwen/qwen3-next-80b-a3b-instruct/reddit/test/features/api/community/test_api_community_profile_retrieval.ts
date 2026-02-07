import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityCommunity";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_community_profile_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // Generate a random valid community ID using UUID format
  const communityId = typia.random<string & tags.Format<"uuid">>();
  // Use the base connection to create a connection context for API calls
  const communityConnection: api.IConnection = { host: connection.host };
  // Retrieve the community profile using the generated community ID
  const community = await api.functional.community.communities.at(
    communityConnection,
    {
      communityId,
    },
  );
  // Validate the retrieved community profile against its schema and assert it extends IEntity
  const typedCommunity = typia.assert<ICommunityCommunity & IEntity>(community);
  // Verify the community ID matches request (since id is defined in IEntity)
  TestValidator.equals(
    "community ID matches request",
    typedCommunity.id,
    communityId,
  );
}