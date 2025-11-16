import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberuser";

/**
 * Validate creation of a new community by a freshly joined member user.
 *
 * Business workflow:
 *
 * 1. Register a new member user via auth.memberUser.join with IJoin body.
 * 2. Using the authenticated connection, call
 *    communityPlatform.memberUser.communities.create with an
 *    ICommunityPlatformCommunity.ICreate payload representing an "active
 *    public" community configuration.
 * 3. Assert the created ICommunityPlatformCommunity mirrors the requested fields
 *    (slug, name, visibility, status and posting flags) and that system-managed
 *    fields like owner_memberuser_id and timestamps are populated
 *    consistently.
 */
export async function test_api_community_creation_by_new_member_user(
  connection: api.IConnection,
) {
  // 1. Join/register a new member user
  const joinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    // ip left undefined to let backend infer it
    href: "https://client.example.com/register",
    referrer: "https://client.example.com/landing",
  } satisfies ICommunityPlatformMemberuser.IJoin;

  const authorized: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: joinBody,
    });
  typia.assert(authorized);

  // 2. Prepare community creation payload for an "active public" community
  const slugBase = RandomGenerator.alphaNumeric(16);
  const communitySlug: string & tags.MinLength<1> & tags.MaxLength<128> =
    `${slugBase}`;
  const communityName: string & tags.MinLength<1> & tags.MaxLength<255> =
    RandomGenerator.paragraph({
      sentences: 2,
      wordMin: 3,
      wordMax: 10,
    });

  const createBody = {
    slug: communitySlug,
    name: communityName,
    description: RandomGenerator.paragraph({
      sentences: 5,
      wordMin: 3,
      wordMax: 10,
    }),
    visibility: "public",
    status: "active",
    is_nsfw: false,
    is_quarantined: false,
    is_posting_restricted: false,
    allow_text_posts: true,
    allow_link_posts: true,
    allow_image_posts: true,
  } satisfies ICommunityPlatformCommunity.ICreate;

  const created: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.memberUser.communities.create(
      connection,
      {
        body: createBody,
      },
    );
  typia.assert(created);

  // 3. Validate that response mirrors request for client-controlled fields
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
  TestValidator.equals(
    "created community visibility matches request",
    created.visibility,
    createBody.visibility,
  );
  TestValidator.equals(
    "created community status matches request",
    created.status,
    createBody.status,
  );
  TestValidator.equals(
    "created community is_nsfw persisted",
    created.is_nsfw,
    createBody.is_nsfw,
  );
  TestValidator.equals(
    "created community is_quarantined persisted",
    created.is_quarantined,
    createBody.is_quarantined,
  );
  TestValidator.equals(
    "created community is_posting_restricted persisted",
    created.is_posting_restricted,
    createBody.is_posting_restricted,
  );
  TestValidator.equals(
    "created community allow_text_posts persisted",
    created.allow_text_posts,
    createBody.allow_text_posts,
  );
  TestValidator.equals(
    "created community allow_link_posts persisted",
    created.allow_link_posts,
    createBody.allow_link_posts,
  );
  TestValidator.equals(
    "created community allow_image_posts persisted",
    created.allow_image_posts,
    createBody.allow_image_posts,
  );

  // 4. Validate owner and lifecycle fields
  TestValidator.equals(
    "owner_memberuser_id is set to authorized member user id",
    created.owner_memberuser_id,
    authorized.id,
  );

  // deleted_at should represent a non-deleted community; allow undefined or null
  TestValidator.predicate(
    "newly created community is not soft-deleted",
    created.deleted_at === undefined || created.deleted_at === null,
  );

  // Expect created_at and updated_at to be equal immediately after creation
  TestValidator.equals(
    "created_at and updated_at are equal on initial creation",
    created.created_at,
    created.updated_at,
  );
}
