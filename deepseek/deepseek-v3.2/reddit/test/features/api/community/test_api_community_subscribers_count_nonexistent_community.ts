import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformMvCommunitySubscriberCount } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMvCommunitySubscriberCount";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_community_subscribers_count_nonexistent_community(
  connection: api.IConnection,
): Promise<void> {
  // Generate a random string that doesn't correspond to any existing community
  // Using RandomGenerator.alphabets to create a random string
  const nonExistentCommunityId = RandomGenerator.alphabets(36); // 36 characters, longer than typical UUID
  // Attempt to retrieve subscriber count for non-existent community
  // Expecting 404 Not Found error
  await TestValidator.httpError(
    "should return 404 for non-existent community",
    404,
    async () => {
      await api.functional.communityPlatform.communities.subscribers.count.at(
        connection,
        { communityId: nonExistentCommunityId },
      );
    },
  );
}
