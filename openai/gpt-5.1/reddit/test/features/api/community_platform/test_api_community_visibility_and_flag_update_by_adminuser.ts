import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdminUserJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminUserJoin";
import type { ICommunityPlatformAdminUserLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminUserLogin";
import type { ICommunityPlatformAdminuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminuser";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberuser";

export async function test_api_community_visibility_and_flag_update_by_adminuser(
  connection: api.IConnection,
) {
  // 1. Register a member user (memberUser join) to own the community
  const memberJoinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(10),
    // Optional ip is omitted to let backend infer it
    href: "https://client.example.com/signup",
    referrer: "https://client.example.com/landing",
  } satisfies ICommunityPlatformMemberuser.IJoin;

  const memberAuthorized: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberJoinBody,
    });
  typia.assert(memberAuthorized);

  // 2. As this memberUser, create a baseline community
  const communitySlugBase = RandomGenerator.alphaNumeric(12);
  const createBody = {
    slug: communitySlugBase,
    name: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.paragraph({ sentences: 5 }),
    visibility: "public",
    status: "active",
    is_nsfw: false,
    is_quarantined: false,
    is_posting_restricted: false,
    allow_text_posts: true,
    allow_link_posts: true,
    allow_image_posts: true,
  } satisfies ICommunityPlatformCommunity.ICreate;

  const createdCommunity: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.memberUser.communities.create(
      connection,
      {
        body: createBody,
      },
    );
  typia.assert(createdCommunity);

  // Preserve identity and baseline configuration flags
  const originalId = createdCommunity.id;
  const originalSlug = createdCommunity.slug;
  const originalOwnerId = createdCommunity.owner_memberuser_id;
  const originalCreatedAt = createdCommunity.created_at;
  const originalUpdatedAt = createdCommunity.updated_at;
  const originalVisibility = createdCommunity.visibility;
  const originalIsNsfw = createdCommunity.is_nsfw;
  const originalIsQuarantined = createdCommunity.is_quarantined;
  const originalIsPostingRestricted = createdCommunity.is_posting_restricted;
  const originalAllowTextPosts = createdCommunity.allow_text_posts;
  const originalAllowLinkPosts = createdCommunity.allow_link_posts;
  const originalAllowImagePosts = createdCommunity.allow_image_posts;

  // 3. Register an adminUser (adminUser join) to perform privileged update
  const adminJoinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    // Use a strong random password string; tags.Format<"password"> is enforced by typia
    password: RandomGenerator.alphaNumeric(12),
  } satisfies ICommunityPlatformAdminUserJoin.IRequest;

  const adminAuthorized: ICommunityPlatformAdminuser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);

  // At this point, SDK has switched connection.headers.Authorization to admin token

  // 4. Admin updates only configuration/moderation flags of the community
  const updateBody = {
    visibility: "restricted",
    is_nsfw: true,
    is_quarantined: true,
    is_posting_restricted: true,
    allow_text_posts: originalAllowTextPosts,
    allow_link_posts: originalAllowLinkPosts,
    allow_image_posts: false,
  } satisfies ICommunityPlatformCommunity.IUpdate;

  const updatedCommunity: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.adminUser.communities.update(
      connection,
      {
        communitySlug: originalSlug,
        body: updateBody,
      },
    );
  typia.assert(updatedCommunity);

  // 5. Validate identity fields are unchanged
  TestValidator.equals(
    "community id must remain unchanged after admin update",
    updatedCommunity.id,
    originalId,
  );
  TestValidator.equals(
    "community slug must remain unchanged after admin update",
    updatedCommunity.slug,
    originalSlug,
  );
  TestValidator.equals(
    "community owner_memberuser_id must remain unchanged after admin update",
    updatedCommunity.owner_memberuser_id,
    originalOwnerId,
  );
  TestValidator.equals(
    "community created_at must remain unchanged after admin update",
    updatedCommunity.created_at,
    originalCreatedAt,
  );

  // 6. Validate configuration/moderation flags changed as requested
  TestValidator.notEquals(
    "visibility should change from original to updated value",
    updatedCommunity.visibility,
    originalVisibility,
  );
  TestValidator.equals(
    "visibility should be updated to restricted",
    updatedCommunity.visibility,
    "restricted",
  );

  TestValidator.notEquals(
    "is_nsfw flag should toggle from original",
    updatedCommunity.is_nsfw,
    originalIsNsfw,
  );
  TestValidator.equals(
    "is_nsfw should be true after admin update",
    updatedCommunity.is_nsfw,
    true,
  );

  TestValidator.notEquals(
    "is_quarantined flag should toggle from original",
    updatedCommunity.is_quarantined,
    originalIsQuarantined,
  );
  TestValidator.equals(
    "is_quarantined should be true after admin update",
    updatedCommunity.is_quarantined,
    true,
  );

  TestValidator.notEquals(
    "is_posting_restricted flag should toggle from original",
    updatedCommunity.is_posting_restricted,
    originalIsPostingRestricted,
  );
  TestValidator.equals(
    "is_posting_restricted should be true after admin update",
    updatedCommunity.is_posting_restricted,
    true,
  );

  TestValidator.equals(
    "allow_text_posts remains unchanged after admin update",
    updatedCommunity.allow_text_posts,
    originalAllowTextPosts,
  );
  TestValidator.equals(
    "allow_link_posts remains unchanged after admin update",
    updatedCommunity.allow_link_posts,
    originalAllowLinkPosts,
  );

  TestValidator.notEquals(
    "allow_image_posts flag should toggle from original",
    updatedCommunity.allow_image_posts,
    originalAllowImagePosts,
  );
  TestValidator.equals(
    "allow_image_posts should be false after admin update",
    updatedCommunity.allow_image_posts,
    false,
  );

  // 7. Verify that updated_at changed to reflect the update
  TestValidator.notEquals(
    "updated_at should change after community flags are updated",
    updatedCommunity.updated_at,
    originalUpdatedAt,
  );
}
