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

/**
 * Validate that an adminUser can update a member-created community while
 * preserving immutable fields.
 *
 * Business context:
 *
 * - Regular member users (memberUser) can create communities via the memberUser
 *   community creation endpoint.
 * - Administrative users (adminUser) have elevated permissions and can update
 *   community configuration via an admin-only endpoint that targets communities
 *   by slug.
 *
 * This E2E test verifies a realistic cross-actor workflow:
 *
 * 1. A memberUser joins (registers) the platform.
 * 2. That memberUser creates a community with an initial configuration.
 * 3. An adminUser joins (registers) the platform and becomes authenticated.
 * 4. The adminUser updates the community using the admin-only update endpoint,
 *    changing multiple mutable fields in one request.
 * 5. The response from the update call reflects the new configuration while
 *    preserving immutable fields such as slug and owner_memberuser_id.
 *
 * Steps and expectations:
 *
 * 1. Call auth.memberUser.join with a realistic ICommunityPlatformMemberuser.IJoin
 *    body.
 *
 *    - Validate the response as ICommunityPlatformMemberuser.IAuthorized.
 * 2. Using the authenticated memberUser context, call
 *    communityPlatform.memberUser.communities.create with an
 *    ICommunityPlatformCommunity.ICreate body that fills all required fields.
 *
 *    - Capture the returned ICommunityPlatformCommunity as `created` and validate
 *         with typia.assert.
 * 3. Call auth.adminUser.join with a realistic
 *    ICommunityPlatformAdminUserJoin.IRequest body.
 *
 *    - Validate the response as ICommunityPlatformAdminuser.IAuthorized.
 * 4. As the authenticated adminUser, call
 *    communityPlatform.adminUser.communities.update with:
 *
 *    - CommunitySlug: created.slug
 *    - Body: an ICommunityPlatformCommunity.IUpdate object that updates:
 *
 *         - Name
 *         - Description (including testing explicit null or a new description)
 *         - Visibility
 *         - Status
 *         - Is_nsfw
 *         - Is_quarantined
 *         - Is_posting_restricted
 *         - Allow_text_posts
 *         - Allow_link_posts
 *         - Allow_image_posts
 *    - Validate the response as ICommunityPlatformCommunity.
 * 5. Using TestValidator, assert that:
 *
 *    - The slug before and after update is identical.
 *    - The owner_memberuser_id before and after update is identical (still the
 *         original memberUser owner).
 *    - Each mutable field that we changed in the update body now equals the new
 *         value in the response.
 *
 * We deliberately skip an additional public GET-by-slug readback because such
 * an endpoint is not present in the provided SDK list. Instead, we rely on the
 * update response to represent the persisted state, as per the API contract.
 */
export async function test_api_community_update_by_adminuser_after_member_creation(
  connection: api.IConnection,
) {
  // 1. Member user joins (registers) the platform.
  const memberJoinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(10),
    ip: null,
    href: "https://community.example.com/register",
    referrer: "https://community.example.com/landing",
  } satisfies ICommunityPlatformMemberuser.IJoin;

  const memberAuthorized: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberJoinBody,
    });
  typia.assert(memberAuthorized);

  // 2. Member user creates a community with initial configuration.
  const initialSlug: string & tags.MinLength<1> & tags.MaxLength<128> =
    (RandomGenerator.alphaNumeric(8).toLowerCase() + "-community") as string &
      tags.MinLength<1> &
      tags.MaxLength<128>;

  const initialCreateBody = {
    slug: initialSlug,
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
        body: initialCreateBody,
      },
    );
  typia.assert(createdCommunity);

  // Basic sanity check: slug from response should equal the requested one.
  TestValidator.equals(
    "created community slug must match requested slug",
    createdCommunity.slug,
    initialCreateBody.slug,
  );

  // 3. Admin user joins (registers) the platform to get an admin context.
  const adminJoinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
  } satisfies ICommunityPlatformAdminUserJoin.IRequest;

  const adminAuthorized: ICommunityPlatformAdminuser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);

  // 4. As adminUser, update the community identified by slug with multiple
  //    mutable fields changed at once.
  const updatedName = RandomGenerator.paragraph({ sentences: 2 });
  const updatedDescription = RandomGenerator.paragraph({ sentences: 4 });
  const updatedVisibility = "restricted";
  const updatedStatus = "locked";
  const updatedIsNsfw = true;
  const updatedIsQuarantined = true;
  const updatedIsPostingRestricted = true;
  const updatedAllowTextPosts = true;
  const updatedAllowLinkPosts = false;
  const updatedAllowImagePosts = false;

  const updateBody = {
    name: updatedName,
    description: updatedDescription,
    visibility: updatedVisibility,
    status: updatedStatus,
    is_nsfw: updatedIsNsfw,
    is_quarantined: updatedIsQuarantined,
    is_posting_restricted: updatedIsPostingRestricted,
    allow_text_posts: updatedAllowTextPosts,
    allow_link_posts: updatedAllowLinkPosts,
    allow_image_posts: updatedAllowImagePosts,
  } satisfies ICommunityPlatformCommunity.IUpdate;

  const updatedCommunity: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.adminUser.communities.update(
      connection,
      {
        communitySlug: createdCommunity.slug,
        body: updateBody,
      },
    );
  typia.assert(updatedCommunity);

  // 5. Assertions: immutable fields preserved, mutable fields updated.
  TestValidator.equals(
    "community slug must remain unchanged after admin update",
    updatedCommunity.slug,
    createdCommunity.slug,
  );

  TestValidator.equals(
    "owner_memberuser_id must remain the original creator after admin update",
    updatedCommunity.owner_memberuser_id,
    createdCommunity.owner_memberuser_id,
  );

  TestValidator.equals(
    "updated name must match the requested name",
    updatedCommunity.name,
    updatedName,
  );

  TestValidator.equals(
    "updated description must match the requested description",
    updatedCommunity.description,
    updatedDescription,
  );

  TestValidator.equals(
    "updated visibility must match the requested visibility",
    updatedCommunity.visibility,
    updatedVisibility,
  );

  TestValidator.equals(
    "updated status must match the requested status",
    updatedCommunity.status,
    updatedStatus,
  );

  TestValidator.equals(
    "updated is_nsfw must match the requested flag",
    updatedCommunity.is_nsfw,
    updatedIsNsfw,
  );

  TestValidator.equals(
    "updated is_quarantined must match the requested flag",
    updatedCommunity.is_quarantined,
    updatedIsQuarantined,
  );

  TestValidator.equals(
    "updated is_posting_restricted must match the requested flag",
    updatedCommunity.is_posting_restricted,
    updatedIsPostingRestricted,
  );

  TestValidator.equals(
    "updated allow_text_posts must match the requested flag",
    updatedCommunity.allow_text_posts,
    updatedAllowTextPosts,
  );

  TestValidator.equals(
    "updated allow_link_posts must match the requested flag",
    updatedCommunity.allow_link_posts,
    updatedAllowLinkPosts,
  );

  TestValidator.equals(
    "updated allow_image_posts must match the requested flag",
    updatedCommunity.allow_image_posts,
    updatedAllowImagePosts,
  );
}
