import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityModerator";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";
import type { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformCommunityModerator";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_community_moderators_list_filtered_by_community_and_role(
  connection: api.IConnection,
): Promise<void> {
  // Create admin connection (assuming admin role needed for listing moderators)
  const adminConnection: api.IConnection = { host: connection.host };
  // Generate a random UUID for communityId to filter
  const communityId = typia.random<string & tags.Format<"uuid">>();
  // Role to filter
  const role = "moderator" as "moderator";
  // Setup pagination parameters for testing with required tags
  const page = (1 as number & tags.Type<"int32"> & tags.Minimum<1>) satisfies number & tags.Type<"int32"> & tags.Minimum<1>;
  const limit = (10 as number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>) satisfies number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>;
  // Call the moderators index API with filter
  const response = await api.functional.communityPlatform.moderators.index(
    adminConnection,
    {
      body: {
        communityId,
        role,
        page,
        limit,
      } satisfies ICommunityPlatformCommunityModerator.IRequest,
    },
  );
  typia.assert(response);
  // Validate pagination properties
  TestValidator.predicate(
    "has pagination info",
    response.pagination !== null && response.pagination !== undefined,
  );
  TestValidator.equals("page number", response.pagination.current, page);
  TestValidator.predicate("limit positive", response.pagination.limit > 0);
  // Validate each moderator in response
  for (const moderator of response.data) {
    typia.assert(moderator);
    TestValidator.equals("moderator role", moderator.role, role);
    TestValidator.equals("community id", moderator.community.id, communityId);
    typia.assert(moderator.community);
    typia.assert(moderator.communityModerator);
    TestValidator.predicate(
      "moderator is active",
      moderator.deletedAt === null || moderator.deletedAt === undefined,
    );
  }
}
