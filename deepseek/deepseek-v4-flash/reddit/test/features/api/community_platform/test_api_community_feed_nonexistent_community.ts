import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformPost";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_community_feed_nonexistent_community(
  connection: api.IConnection,
): Promise<void> {
  // This endpoint requires no authentication - use a guest connection
  const guestConnection: api.IConnection = { host: connection.host };
  // Generate a community name that clearly does not exist
  const nonexistentCommunityName: string = `nonexistent-${RandomGenerator.alphabets(8)}`;
  // The community feed endpoint should return 404 when the community name
  // does not match any existing record
  await TestValidator.httpError(
    "nonexistent community feed returns 404",
    404,
    async () => {
      await api.functional.communityPlatform.communities.posts.feeds.index(
        guestConnection,
        {
          communityName: nonexistentCommunityName,
          body: {
            sort: "new",
            limit: 20,
          },
        },
      );
    },
  );
}
