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

export async function test_api_announcement_retrieval_success(
  connection: api.IConnection,
): Promise<void> {
  // Test both pinned and non-pinned announcements
  const announcementIds = ArrayUtil.repeat(2, (index) =>
    typia.random<string & tags.Format<"uuid">>(),
  );
  const communityId = typia.random<string & tags.Format<"uuid">>();
  // Test first announcement (non-pinned)
  const announcement1 =
    await api.functional.communityPlatform.communities.announcements.at(
      connection,
      {
        communityId: communityId,
        announcementId: announcementIds[0],
      },
    );
  typia.assert(announcement1);
  // Test second announcement (pinned)
  const announcement2 =
    await api.functional.communityPlatform.communities.announcements.at(
      connection,
      {
        communityId: communityId,
        announcementId: announcementIds[1],
      },
    );
  typia.assert(announcement2);
  // Validate business logic: Ensure announcements have different IDs
  TestValidator.notEquals(
    "announcements have different IDs",
    announcement1.id,
    announcement2.id,
  );
  // Validate business logic: Check community relationship consistency
  TestValidator.equals(
    "both announcements belong to same community",
    announcement1.community.id,
    announcement2.community.id,
  );
}
