import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityAnnouncement } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityAnnouncement";
import type { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";
import { generate_random_community_platform_admin_communities_announcements_create } from "../../../generate/generate_random_community_platform_admin_communities_announcements_create";
import { generate_random_community_platform_user_communities_create } from "../../../generate/generate_random_community_platform_user_communities_create";
import { prepare_random_community_platform_community } from "../../../prepare/prepare_random_community_platform_community";
import { prepare_random_community_platform_community_announcement } from "../../../prepare/prepare_random_community_platform_community_announcement";

/**
 * Test changing announcement status from active to draft.
 * As admin, create community and active announcement.
 * Update announcement with status field changed to 'draft'.
 * Verify status field can be updated to allowed values,
 * announcement remains associated with correct community and author,
 * and immutable fields remain unchanged.
 */
export async function test_api_community_announcement_status_change_to_draft(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create admin user and authenticate
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = "admin1234";
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      display_name: RandomGenerator.name(),
    },
  });
  await authorize_admin_login(adminConnection, {
    body: {
      email: adminEmail,
      password: adminPassword,
    } satisfies ICommunityPlatformAdmin.ILogin,
  });
  // 2. Create regular user and authenticate for community creation
  const userEmail = typia.random<string & tags.Format<"email">>();
  const userPassword = "user1234";
  const userConnection: api.IConnection = { host: connection.host };
  await authorize_user_join(userConnection, {
    body: {
      email: userEmail,
      password: userPassword,
      username: RandomGenerator.alphaNumeric(8),
    },
  });
  await authorize_user_login(userConnection, {
    body: {
      email: userEmail,
      password: userPassword,
    } satisfies ICommunityPlatformUser.ILogin,
  });
  // 3. Create community as user
  const community =
    await generate_random_community_platform_user_communities_create(
      userConnection,
      {
        body: {
          name: RandomGenerator.paragraph({ sentences: 1 }),
          description: RandomGenerator.paragraph({ sentences: 3 }),
        },
      },
    );
  typia.assert(community);
  // 4. Create announcement with active status as admin
  const announcement =
    await generate_random_community_platform_admin_communities_announcements_create(
      adminConnection,
      {
        body: {
          title: RandomGenerator.paragraph({ sentences: 2 }),
          content: RandomGenerator.content({ paragraphs: 2 }),
          status: "active" as const,
        },
        params: {
          communityId: community.id,
        },
      },
    );
  typia.assert(announcement);
  // Verify initial status is active
  TestValidator.equals(
    "initial status should be active",
    announcement.status,
    "active",
  );
  // 5. Update announcement status to draft (partial update)
  const updatedAnnouncement =
    await api.functional.communityPlatform.admin.communities.announcements.update(
      adminConnection,
      {
        communityId: community.id,
        announcementId: announcement.id,
        body: {
          status: "draft",
        } satisfies ICommunityPlatformCommunityAnnouncement.IUpdate,
      },
    );
  typia.assert(updatedAnnouncement);
  // 6. Validate the update
  TestValidator.equals(
    "status should be updated to draft",
    updatedAnnouncement.status,
    "draft",
  );
  TestValidator.equals(
    "id should remain unchanged",
    updatedAnnouncement.id,
    announcement.id,
  );
  TestValidator.equals(
    "community id should remain unchanged",
    updatedAnnouncement.community.id,
    community.id,
  );
  TestValidator.equals(
    "author id should remain unchanged",
    updatedAnnouncement.author.id,
    announcement.author.id,
  );
  TestValidator.equals(
    "created_at should remain unchanged",
    updatedAnnouncement.created_at,
    announcement.created_at,
  );
  TestValidator.equals(
    "title should remain unchanged",
    updatedAnnouncement.title,
    announcement.title,
  );
  TestValidator.equals(
    "content should remain unchanged",
    updatedAnnouncement.content,
    announcement.content,
  );
  TestValidator.equals(
    "is_pinned should remain unchanged",
    updatedAnnouncement.is_pinned,
    announcement.is_pinned,
  );
}
