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
 * Test updating an existing community announcement's content and pinned status.
 * 1. Admin creates account and logs in
 * 2. Create a community
 * 3. Create an initial announcement
 * 4. Update announcement with new title, content, and toggle is_pinned
 * 5. Validate only allowed fields can be updated
 * 6. Verify updated_at timestamp is updated, pinned_at is set appropriately
 * 7. Check response contains complete updated announcement with proper relationships
 * 8. Validate announcement belongs to specified community via ID validation
 */
export async function test_api_community_announcement_update_content_pinned_status(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin setup
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      permissions_level: null,
    } satisfies ICommunityPlatformAdmin.IJoin,
  });
  // Admin login
  const adminLoginBody: ICommunityPlatformAdmin.ILogin = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
  };
  await authorize_admin_join(adminConnection, { body: adminLoginBody });
  // 2. Create community as prerequisite
  const createCommunityBody = {
    name: RandomGenerator.paragraph({ sentences: 1, wordMin: 3, wordMax: 5 }),
    description: RandomGenerator.paragraph({ sentences: 2 }),
    icon_url: typia.random<string & tags.Format<"uri">>(),
  } satisfies ICommunityPlatformCommunity.ICreate;
  const community =
    await generate_random_community_platform_user_communities_create(
      adminConnection,
      { body: createCommunityBody },
    );
  typia.assert(community);
  // 3. Create initial announcement
  const initialAnnouncementBody = {
    title: RandomGenerator.paragraph({ sentences: 1, wordMin: 2, wordMax: 4 }),
    content: RandomGenerator.content({
      paragraphs: 1,
      sentenceMin: 2,
      sentenceMax: 4,
    }),
    is_pinned: false,
    status: "active" as const,
  } satisfies ICommunityPlatformCommunityAnnouncement.ICreate;
  const initialAnnouncement =
    await generate_random_community_platform_admin_communities_announcements_create(
      adminConnection,
      {
        body: initialAnnouncementBody,
        params: { communityId: community.id },
      },
    );
  typia.assert(initialAnnouncement);
  // 4. Update announcement
  const updateBody = {
    title: RandomGenerator.paragraph({ sentences: 1, wordMin: 2, wordMax: 4 }),
    content: RandomGenerator.content({
      paragraphs: 2,
      sentenceMin: 3,
      sentenceMax: 5,
    }),
    is_pinned: true,
  } satisfies ICommunityPlatformCommunityAnnouncement.IUpdate;
  const updatedAnnouncement =
    await api.functional.communityPlatform.admin.communities.announcements.update(
      adminConnection,
      {
        communityId: community.id,
        announcementId: initialAnnouncement.id,
        body: updateBody,
      },
    );
  typia.assert(updatedAnnouncement);
  // 5. Validate only allowed fields can be updated
  TestValidator.equals(
    "only allowed fields updated - title",
    updatedAnnouncement.title,
    updateBody.title!,
  );
  TestValidator.equals(
    "only allowed fields updated - content",
    updatedAnnouncement.content,
    updateBody.content!,
  );
  TestValidator.equals(
    "only allowed fields updated - is_pinned",
    updatedAnnouncement.is_pinned,
    updateBody.is_pinned!,
  );
  // 6. Verify timestamps
  TestValidator.notEquals(
    "updated_at timestamp should be updated",
    updatedAnnouncement.updated_at,
    initialAnnouncement.updated_at,
  );
  TestValidator.predicate(
    "pinned_at should be set when is_pinned is true",
    updatedAnnouncement.pinned_at !== null &&
      updatedAnnouncement.pinned_at !== undefined,
  );
  // 7. Check response contains complete updated announcement with relationships
  TestValidator.equals(
    "id should remain unchanged",
    updatedAnnouncement.id,
    initialAnnouncement.id,
  );
  TestValidator.equals(
    "community relationship preserved",
    updatedAnnouncement.community.id,
    community.id,
  );
  TestValidator.equals(
    "author relationship preserved",
    updatedAnnouncement.author.id,
    initialAnnouncement.author.id,
  );
  // 8. Validate announcement belongs to specified community
  TestValidator.equals(
    "announcement belongs to specified community",
    updatedAnnouncement.community.id,
    community.id,
  );
}