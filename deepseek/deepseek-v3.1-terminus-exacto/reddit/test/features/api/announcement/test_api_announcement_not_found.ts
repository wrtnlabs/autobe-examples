import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityAnnouncement } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityAnnouncement";
import type { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_announcement_not_found(
  connection: api.IConnection,
): Promise<void> {
  // Create actor-specific connection for API calls
  const userConnection: api.IConnection = { host: connection.host };
  // Test 1: Non-existent communityId with valid UUID format
  await TestValidator.error("non-existent community", async () => {
    await api.functional.communityPlatform.communities.announcements.at(
      userConnection,
      {
        communityId: typia.random<string & tags.Format<"uuid">>(),
        announcementId: typia.random<string & tags.Format<"uuid">>(),
      },
    );
  });
  // Test 2: Non-existent announcementId with valid UUID format
  await TestValidator.error("non-existent announcement", async () => {
    await api.functional.communityPlatform.communities.announcements.at(
      userConnection,
      {
        communityId: typia.random<string & tags.Format<"uuid">>(),
        announcementId: typia.random<string & tags.Format<"uuid">>(),
      },
    );
  });
  // Test 3: Mismatched community-announcement relationship
  // Use two different valid UUIDs to simulate announcement belonging to wrong community
  const communityId1 = typia.random<string & tags.Format<"uuid">>();
  const communityId2 = typia.random<string & tags.Format<"uuid">>();
  const announcementId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error(
    "announcement not found in specified community",
    async () => {
      await api.functional.communityPlatform.communities.announcements.at(
        userConnection,
        {
          communityId: communityId2,
          announcementId: announcementId,
        },
      );
    },
  );
}
