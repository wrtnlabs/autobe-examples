import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCloneAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneAdmin";
import type { IRedditCloneAnnouncement } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneAnnouncement";
import type { IRedditCloneCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunity";
import type { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_clone_admin_announcements_create } from "../../../generate/generate_random_reddit_clone_admin_announcements_create";
import { generate_random_reddit_clone_member_communities_create } from "../../../generate/generate_random_reddit_clone_member_communities_create";
import { prepare_random_reddit_clone_announcement } from "../../../prepare/prepare_random_reddit_clone_announcement";
import { prepare_random_reddit_clone_community } from "../../../prepare/prepare_random_reddit_clone_community";

/**
 * Test creating a scheduled announcement targeted to specific communities.
 * 1. Admin registers and logs in
 * 2. Member registers and logs in
 * 3. Member creates a community
 * 4. Admin creates a scheduled announcement targeting the community
 * 5. Validate announcement is scheduled with correct community targeting
 */
export async function test_api_announcement_create_scheduled_community_targeted(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin setup - create and authenticate admin
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: "admin@test.com",
      password: "1234",
      username: "admin_user",
      displayName: "Admin User",
      href: "https://test.com",
      referrer: "https://test.com",
    },
  });
  // 2. Member setup - create and authenticate member
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: "member@test.com",
      password: "1234",
      username: "member_user",
      display_name: "Member User",
      href: "https://test.com",
      referrer: "https://test.com",
    },
  });
  // 3. Member creates a community to target
  const community = await api.functional.redditClone.member.communities.create(
    memberConnection,
    {
      body: {
        name: RandomGenerator.alphabets(10),
        description: "Test community for announcement targeting",
      } satisfies IRedditCloneCommunity.ICreate,
    },
  );
  typia.assert(community);
  // 4. Admin creates scheduled announcement targeting the community
  const scheduledTime = new Date(Date.now() + 3600000).toISOString(); // 1 hour from now
  const announcement =
    await api.functional.redditClone.admin.announcements.create(
      adminConnection,
      {
        body: {
          title: "Scheduled Community Announcement",
          content:
            "This is a test announcement scheduled for future delivery to specific communities.",
          visibilityScope: "community",
          communities: [community.id],
          scheduledDeliveryTime: scheduledTime,
        } satisfies IRedditCloneAnnouncement.ICreate,
      },
    );
  typia.assert(announcement);
  // 5. Validate announcement properties
  TestValidator.equals(
    "announcement status is scheduled",
    announcement.status,
    "scheduled",
  );
  TestValidator.equals(
    "visibility is community",
    announcement.visibility,
    "community",
  );
  TestValidator.equals(
    "scheduledAt is set",
    announcement.scheduledAt,
    scheduledTime,
  );
  TestValidator.equals(
    "communityIds contains target",
    announcement.communityIds,
    [community.id],
  );
  TestValidator.predicate(
    "communityIds is not null",
    announcement.communityIds !== null,
  );
  TestValidator.predicate(
    "userGroups is null for community targeting",
    announcement.userGroups === null,
  );
  TestValidator.equals(
    "title matches input",
    announcement.title,
    "Scheduled Community Announcement",
  );
  TestValidator.equals(
    "content matches input",
    announcement.content,
    "This is a test announcement scheduled for future delivery to specific communities.",
  );
}
