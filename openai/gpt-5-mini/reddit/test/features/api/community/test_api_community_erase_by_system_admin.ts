import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityBbsCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsCommunity";
import type { ICommunityBbsCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsCommunityMember";
import type { ICommunityBbsCommunitySettings } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsCommunitySettings";
import type { ICommunityBbsSystemAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsSystemAdmin";

export async function test_api_community_erase_by_system_admin(
  connection: api.IConnection,
) {
  /**
   * Test overview:
   *
   * 1. Create a community member (owner) via /auth/communityMember/join
   * 2. Create a system admin via /auth/systemAdmin/join
   * 3. Owner creates a community with a unique slug
   * 4. System admin erases (soft-deletes) the community via systemAdmin erase
   * 5. Verify side-effects via API observable behavior:
   *
   *    - Re-creating community with same slug should fail (conflict)
   *    - Repeating erase should error for already-deleted resource
   *    - Non-admin (owner) calling systemAdmin erase should be forbidden
   */

  // Step 0: Prepare isolated connections so SDK's join() sets auth token per-connection
  const ownerConn: api.IConnection = { ...connection, headers: {} };
  const adminConn: api.IConnection = { ...connection, headers: {} };

  // Step 1: Create community member (owner)
  const ownerEmail = typia.random<string & tags.Format<"email">>();
  const ownerUsername = RandomGenerator.alphaNumeric(8);
  const ownerJoinBody = {
    email: ownerEmail,
    username: ownerUsername,
    password: "Passw0rd!",
    session_context: {
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: null,
      session_ttl_seconds: null,
    },
    profile: {
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 6 }),
      avatar_uri: null,
    },
  } satisfies ICommunityBbsCommunityMember.ICreate;

  const ownerAuth: ICommunityBbsCommunityMember.IAuthorized =
    await api.functional.auth.communityMember.join(ownerConn, {
      body: ownerJoinBody,
    });
  typia.assert(ownerAuth);
  TestValidator.predicate(
    "owner token is present after join",
    typeof ownerAuth.token.access === "string" &&
      ownerAuth.token.access.length > 0,
  );

  // Step 2: Create system admin
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminJoinBody = {
    email: adminEmail,
    password: "Passw0rd!",
    display_name: RandomGenerator.name(),
  } satisfies ICommunityBbsSystemAdmin.ICreate;

  const adminAuth: ICommunityBbsSystemAdmin.IAuthorized =
    await api.functional.auth.systemAdmin.join(adminConn, {
      body: adminJoinBody,
    });
  typia.assert(adminAuth);
  TestValidator.predicate(
    "admin token is present after join",
    typeof adminAuth.token.access === "string" &&
      adminAuth.token.access.length > 0,
  );

  // Step 3: Owner creates a community
  const uniqueSuffix = RandomGenerator.alphaNumeric(6);
  const communitySlug = `test-community-${Date.now()}-${uniqueSuffix}`;
  const communityCreateBody = {
    name: `Test Community ${uniqueSuffix}`,
    slug: communitySlug,
    description: RandomGenerator.paragraph({ sentences: 8 }),
    visibility: "public",
    post_approval_required: false,
    settings: {
      visibility: "public",
      require_post_approval: false,
      max_images_per_post: 5,
      allowed_image_mime_types: ["image/jpeg", "image/png"],
    },
  } satisfies ICommunityBbsCommunity.ICreate;

  const community: ICommunityBbsCommunity =
    await api.functional.communityBbs.communityMember.communities.create(
      ownerConn,
      {
        body: communityCreateBody,
      },
    );
  typia.assert(community);
  TestValidator.equals(
    "created community slug matches request",
    community.slug,
    communitySlug,
  );
  TestValidator.equals(
    "created community creator matches owner id",
    community.creator.id,
    ownerAuth.member.id,
  );

  // Step 4: System admin erases the community
  await api.functional.communityBbs.systemAdmin.communities.erase(adminConn, {
    communitySlug,
  });

  // Step 5a: Verify that creating the same community again fails (conflict or domain error)
  await TestValidator.error(
    "creating community with same slug after deletion should fail",
    async () => {
      await api.functional.communityBbs.communityMember.communities.create(
        ownerConn,
        {
          body: communityCreateBody,
        },
      );
    },
  );

  // Step 5b: Repeating erase as admin should error (already deleted)
  await TestValidator.error(
    "repeating system admin erase should fail for already-deleted community",
    async () => {
      await api.functional.communityBbs.systemAdmin.communities.erase(
        adminConn,
        {
          communitySlug,
        },
      );
    },
  );

  // Step 5c: Non-admin (owner) attempting to erase should be forbidden
  await TestValidator.error(
    "non-admin owner cannot call systemAdmin erase (forbidden)",
    async () => {
      await api.functional.communityBbs.systemAdmin.communities.erase(
        ownerConn,
        {
          communitySlug,
        },
      );
    },
  );
}
