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
 * Validate partial update semantics for communities when optional fields are
 * omitted.
 *
 * Business goals:
 *
 * - Confirm that ICommunityPlatformCommunity.IUpdate acts as a true partial
 *   update: only the fields present in the request body are changed, while all
 *   omitted optional fields retain their previous values.
 * - Verify that explicitly setting a nullable field (description) to null clears
 *   it, while other fields not present in the update payload remain unchanged.
 *
 * Scenario steps:
 *
 * 1. Register a memberUser and obtain an authenticated member session.
 * 2. As the memberUser, create a fully configured community with distinctive
 *    values for all mutable attributes (name, description, visibility, status,
 *    is_nsfw, is_quarantined, is_posting_restricted, allow_*_posts).
 * 3. Register an adminUser and obtain an authenticated admin session.
 * 4. As adminUser, perform a partial update that only changes `description` and
 *    `is_posting_restricted`, omitting all other optional fields from
 *    ICommunityPlatformCommunity.IUpdate.
 * 5. Assert that the response reflects updated values for the two provided fields
 *    and preserves all other mutable and identity fields from before the
 *    update.
 * 6. As adminUser, perform a second partial update that explicitly sets
 *    `description` to null and omits all other fields.
 * 7. Assert that the description is cleared (no longer equal to the previous
 *    non-null values) while all other mutable fields remain unchanged, and
 *    identity/ownership fields are stable across all operations.
 */
export async function test_api_community_partial_update_with_optional_fields_omitted(
  connection: api.IConnection,
) {
  // 1. Register a memberUser (join) and establish member session
  const memberJoinBody = {
    username: RandomGenerator.alphabets(10),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    ip: null,
    href: "https://client.example.com/signup",
    referrer: "https://client.example.com/landing",
  } satisfies ICommunityPlatformMemberuser.IJoin;

  const memberAuthorized: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberJoinBody,
    });
  typia.assert(memberAuthorized);

  // 2. Create a fully configured community as the memberUser
  const initialCommunityBody = {
    slug: `community-${RandomGenerator.alphaNumeric(8)}`,
    name: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.paragraph({ sentences: 5 }),
    visibility: "public",
    status: "active",
    is_nsfw: true,
    is_quarantined: false,
    is_posting_restricted: false,
    allow_text_posts: true,
    allow_link_posts: true,
    allow_image_posts: false,
  } satisfies ICommunityPlatformCommunity.ICreate;

  const original: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.memberUser.communities.create(
      connection,
      {
        body: initialCommunityBody,
      },
    );
  typia.assert(original);

  // Sanity checks on original community
  TestValidator.equals(
    "original slug matches create body",
    original.slug,
    initialCommunityBody.slug,
  );
  TestValidator.equals(
    "original visibility matches create body",
    original.visibility,
    initialCommunityBody.visibility,
  );
  TestValidator.equals(
    "original is_nsfw matches create body",
    original.is_nsfw,
    initialCommunityBody.is_nsfw,
  );

  // 3. Register an adminUser (join) and establish admin session
  const adminJoinBody = {
    username: `admin-${RandomGenerator.alphabets(8)}`,
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
  } satisfies ICommunityPlatformAdminUserJoin.IRequest;

  const adminAuthorized: ICommunityPlatformAdminuser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);

  // Optional: ensure admin login also works and re-establishes Authorization header
  const adminLoginBody = {
    identifier: adminJoinBody.email,
    password: adminJoinBody.password,
    ip: null,
    href: "https://admin.example.com/login",
    referrer: "https://admin.example.com/dashboard",
  } satisfies ICommunityPlatformAdminUserLogin.IRequest;

  const adminLoginAuthorized: ICommunityPlatformAdminuser.IAuthorized =
    await api.functional.auth.adminUser.login(connection, {
      body: adminLoginBody,
    });
  typia.assert(adminLoginAuthorized);

  // 4. First partial update: only description and is_posting_restricted
  const updatedDescription = RandomGenerator.paragraph({ sentences: 3 });
  const firstUpdateBody = {
    description: updatedDescription,
    is_posting_restricted: !original.is_posting_restricted,
  } satisfies ICommunityPlatformCommunity.IUpdate;

  const afterFirstUpdate: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.adminUser.communities.update(
      connection,
      {
        communitySlug: original.slug,
        body: firstUpdateBody,
      },
    );
  typia.assert(afterFirstUpdate);

  // 5. Assertions after first update
  TestValidator.equals(
    "id remains unchanged after first update",
    afterFirstUpdate.id,
    original.id,
  );
  TestValidator.equals(
    "slug remains unchanged after first update",
    afterFirstUpdate.slug,
    original.slug,
  );
  TestValidator.equals(
    "owner_memberuser_id remains unchanged after first update",
    afterFirstUpdate.owner_memberuser_id,
    original.owner_memberuser_id,
  );

  TestValidator.equals(
    "description updated when provided in first update",
    afterFirstUpdate.description,
    firstUpdateBody.description,
  );
  TestValidator.equals(
    "is_posting_restricted updated when provided in first update",
    afterFirstUpdate.is_posting_restricted,
    firstUpdateBody.is_posting_restricted,
  );

  TestValidator.equals(
    "name unchanged when omitted in first update",
    afterFirstUpdate.name,
    original.name,
  );
  TestValidator.equals(
    "visibility unchanged when omitted in first update",
    afterFirstUpdate.visibility,
    original.visibility,
  );
  TestValidator.equals(
    "status unchanged when omitted in first update",
    afterFirstUpdate.status,
    original.status,
  );
  TestValidator.equals(
    "is_nsfw unchanged when omitted in first update",
    afterFirstUpdate.is_nsfw,
    original.is_nsfw,
  );
  TestValidator.equals(
    "is_quarantined unchanged when omitted in first update",
    afterFirstUpdate.is_quarantined,
    original.is_quarantined,
  );
  TestValidator.equals(
    "allow_text_posts unchanged when omitted in first update",
    afterFirstUpdate.allow_text_posts,
    original.allow_text_posts,
  );
  TestValidator.equals(
    "allow_link_posts unchanged when omitted in first update",
    afterFirstUpdate.allow_link_posts,
    original.allow_link_posts,
  );
  TestValidator.equals(
    "allow_image_posts unchanged when omitted in first update",
    afterFirstUpdate.allow_image_posts,
    original.allow_image_posts,
  );

  TestValidator.predicate(
    "updated_at is non-empty string after first update",
    () =>
      typeof afterFirstUpdate.updated_at === "string" &&
      afterFirstUpdate.updated_at.length > 0,
  );

  // 6. Second partial update: explicitly clear description via null
  const secondUpdateBody = {
    description: null,
  } satisfies ICommunityPlatformCommunity.IUpdate;

  const afterSecondUpdate: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.adminUser.communities.update(
      connection,
      {
        communitySlug: original.slug,
        body: secondUpdateBody,
      },
    );
  typia.assert(afterSecondUpdate);

  // 7. Assertions after second update
  TestValidator.equals(
    "id remains unchanged after second update",
    afterSecondUpdate.id,
    original.id,
  );
  TestValidator.equals(
    "slug remains unchanged after second update",
    afterSecondUpdate.slug,
    original.slug,
  );
  TestValidator.equals(
    "owner_memberuser_id remains unchanged after second update",
    afterSecondUpdate.owner_memberuser_id,
    original.owner_memberuser_id,
  );

  TestValidator.notEquals(
    "description cleared or changed after setting null in second update",
    afterSecondUpdate.description,
    firstUpdateBody.description,
  );

  TestValidator.equals(
    "is_posting_restricted remains as set in first update when omitted in second update",
    afterSecondUpdate.is_posting_restricted,
    afterFirstUpdate.is_posting_restricted,
  );
  TestValidator.equals(
    "name remains unchanged across updates when never modified",
    afterSecondUpdate.name,
    original.name,
  );
  TestValidator.equals(
    "visibility remains unchanged across updates when never modified",
    afterSecondUpdate.visibility,
    original.visibility,
  );
  TestValidator.equals(
    "status remains unchanged across updates when never modified",
    afterSecondUpdate.status,
    original.status,
  );
  TestValidator.equals(
    "is_nsfw remains unchanged across updates when never modified",
    afterSecondUpdate.is_nsfw,
    original.is_nsfw,
  );
  TestValidator.equals(
    "is_quarantined remains unchanged across updates when never modified",
    afterSecondUpdate.is_quarantined,
    original.is_quarantined,
  );
  TestValidator.equals(
    "allow_text_posts remains unchanged across updates when never modified",
    afterSecondUpdate.allow_text_posts,
    original.allow_text_posts,
  );
  TestValidator.equals(
    "allow_link_posts remains unchanged across updates when never modified",
    afterSecondUpdate.allow_link_posts,
    original.allow_link_posts,
  );
  TestValidator.equals(
    "allow_image_posts remains unchanged across updates when never modified",
    afterSecondUpdate.allow_image_posts,
    original.allow_image_posts,
  );
}
