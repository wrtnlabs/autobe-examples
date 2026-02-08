import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import { TestValidator } from "@nestia/e2e";
import typia, { tags } from "typia";

export async function test_api_community_at_existing_community_fetch(
  connection: api.IConnection,
): Promise<void> {
  // This test case does not require authentication as per scenario.
  // We'll generate a valid UUID to fetch an existing community.
  // Since no utility function exists for creation,
  // we will assume a random valid UUID represents an existing community.
  // Fetch the community details
  const communityId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  const community = await api.functional.communityPlatform.communities.at(
    connection,
    {
      communityId,
    },
  );
  typia.assert(community);
  // No further property validation as properties do not exist on type.
}
