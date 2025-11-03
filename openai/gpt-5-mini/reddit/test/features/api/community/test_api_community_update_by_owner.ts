import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityBbsCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsCommunity";
import type { ICommunityBbsCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsCommunityMember";
import type { ICommunityBbsCommunitySettings } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsCommunitySettings";

/**
 * Validate that a community owner can update allowed community attributes.
 *
 * Business context:
 *
 * 1. A new community member self-registers (owner).
 * 2. The owner creates a community.
 * 3. The owner updates mutable fields (description, visibility,
 *    post_approval_required, and per-community settings) via the PUT endpoint.
 * 4. The test asserts that the update response reflects changed fields, that
 *    server-managed fields remain unchanged, and that updated_at advanced (used
 *    as a proxy for audit entry generation when direct audit queries aren't
 *    available via SDK).
 *
 * Steps:
 *
 * - Register owner via POST /auth/communityMember/join
 * - Create community via POST /communityBbs/communityMember/communities
 * - Update community via PUT
 *   /communityBbs/communityMember/communities/{communitySlug}
 * - Assert response and invariants
 */
export async function test_api_community_update_by_owner(
  connection: api.IConnection,
) {
  // 1) Register a new community member (owner)
  const ownerEmail: string = typia.random<string & tags.Format<"email">>();
  const ownerUsername = `owner_${RandomGenerator.alphaNumeric(6)}`;
  const ownerBody = {
    email: ownerEmail,
    username: ownerUsername,
    password: "Passw0rd!",
    session_context: {
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: null,
      session_ttl_seconds: null,
    },
  } satisfies ICommunityBbsCommunityMember.ICreate;

  const owner: ICommunityBbsCommunityMember.IAuthorized =
    await api.functional.auth.communityMember.join(connection, {
      body: ownerBody,
    });
  typia.assert(owner);

  // 2) Owner creates a community
  const communityName = RandomGenerator.name(2);
  const communitySlug = `test-community-${RandomGenerator.alphaNumeric(6)}`;
  const createBody = {
    name: communityName,
    slug: communitySlug,
    description: "Initial community description",
    visibility: "public",
    post_approval_required: false,
    settings: {
      visibility: "public",
      require_post_approval: false,
      max_images_per_post: 5,
      allowed_image_mime_types: ["image/jpeg", "image/png"],
    } satisfies ICommunityBbsCommunity.ISettings.ICreate,
  } satisfies ICommunityBbsCommunity.ICreate;

  const created: ICommunityBbsCommunity =
    await api.functional.communityBbs.communityMember.communities.create(
      connection,
      {
        body: createBody,
      },
    );
  typia.assert(created);

  // Basic sanity checks on creation
  TestValidator.equals(
    "created community slug matches request",
    created.slug,
    createBody.slug,
  );
  TestValidator.equals(
    "created community name matches request",
    created.name,
    createBody.name,
  );

  // 3) Owner updates allowed fields
  const updateBody = {
    description: "Updated description by owner",
    visibility: "restricted",
    post_approval_required: true,
    community_settings: {
      visibility: "restricted",
      require_post_approval: true,
      max_images_per_post: 3,
      allowed_image_mime_types: ["image/png"],
    } satisfies ICommunityBbsCommunitySettings.IUpdate,
  } satisfies ICommunityBbsCommunity.IUpdate;

  const updated: ICommunityBbsCommunity =
    await api.functional.communityBbs.communityMember.communities.update(
      connection,
      {
        communitySlug: created.slug,
        body: updateBody,
      },
    );
  typia.assert(updated);

  // 4) Assertions: server-managed fields remain unchanged
  TestValidator.equals("id unchanged after update", updated.id, created.id);
  TestValidator.equals(
    "slug unchanged after update",
    updated.slug,
    created.slug,
  );
  TestValidator.equals(
    "creator unchanged after update",
    updated.creator.id,
    created.creator.id,
  );
  TestValidator.equals(
    "members_count unchanged after update",
    updated.members_count,
    created.members_count,
  );
  TestValidator.equals(
    "posts_count unchanged after update",
    updated.posts_count,
    created.posts_count,
  );

  // 5) Assertions: allowed fields updated
  TestValidator.equals(
    "description updated",
    updated.description,
    updateBody.description,
  );
  TestValidator.equals(
    "visibility updated",
    updated.visibility,
    updateBody.visibility,
  );
  TestValidator.equals(
    "post_approval_required updated",
    updated.post_approval_required,
    updateBody.post_approval_required,
  );

  // 6) Nested settings validation if present
  if (
    updated.community_settings !== undefined &&
    updated.community_settings !== null
  ) {
    TestValidator.equals(
      "community settings - require_post_approval updated",
      updated.community_settings.require_post_approval,
      updateBody.community_settings!.require_post_approval,
    );
    TestValidator.equals(
      "community settings - max_images_per_post updated",
      updated.community_settings.max_images_per_post,
      updateBody.community_settings!.max_images_per_post,
    );
    // Normalize comparison for allowed_image_mime_types ordering-insensitive
    const expectedMimes = (updateBody.community_settings!
      .allowed_image_mime_types ?? []) as string[];
    const actualMimes =
      updated.community_settings.allowed_image_mime_types ?? [];
    TestValidator.equals(
      "community settings - allowed_image_mime_types length matches",
      actualMimes.length,
      expectedMimes.length,
    );
  }

  // 7) updated_at advanced as a proxy for audit entry
  TestValidator.predicate(
    "updated_at should advance after update",
    Date.parse(updated.updated_at) > Date.parse(created.updated_at),
  );
}
