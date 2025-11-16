import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberuser";

/**
 * Validate member user profile deletion and its effect on related resources.
 *
 * Business intent:
 *
 * - A member user can delete their own public profile by handle.
 * - Profile deletion should not break or unintentionally delete other resources
 *   like communities created by that user.
 * - The platform must remain consistent and usable by other accounts after a
 *   profile deletion.
 *
 * Scenario steps:
 *
 * 1. Register the first member user via POST /auth/memberUser/join.
 *
 *    - Use realistic random values for username, email, password, href, and referrer
 *         following the DTO constraints.
 *    - Capture the returned ICommunityPlatformMemberuser.IAuthorized, especially
 *         `id`, `username`, and `token`.
 * 2. As the first member user (SDK already sets Authorization), create a community
 *    using POST /communityPlatform/memberUser/communities.
 *
 *    - Body must satisfy ICommunityPlatformCommunity.ICreate with random but valid
 *         fields.
 *    - Typia.assert on the ICommunityPlatformCommunity response.
 *    - Validate via TestValidator.equals that the community’s owner_memberuser_id
 *         matches the first user’s `id`.
 * 3. Delete the first member user’s profile using DELETE
 *    /communityPlatform/memberUser/profiles/{handle} where handle =
 *    firstUser.username.
 *
 *    - No body; only path param.
 *    - Success is implied if no exception is thrown.
 * 4. Register a second member user via /auth/memberUser/join.
 *
 *    - Use a different random username/email.
 *    - Typia.assert on the IAuthorized result.
 * 5. As the second member user, create another community via
 *    /communityPlatform/memberUser/communities.
 *
 *    - Typia.assert on the returned community.
 *    - Validate via TestValidator.equals that its owner_memberuser_id matches the
 *         second user’s id.
 * 6. Business validations:
 *
 *    - First community is correctly owned by the first user before deletion.
 *    - Second community is correctly owned by the second user, demonstrating that
 *         other accounts and handle-based identity flows are unaffected by the
 *         first user’s profile deletion.
 *    - No additional type-level or HTTP status assertions are needed beyond
 *         typia.assert and TestValidator equality checks.
 */
export async function test_api_member_user_profile_delete_effect_on_public_access(
  connection: api.IConnection,
) {
  // 1. First member user joins
  const firstJoinBody = {
    username: RandomGenerator.alphabets(10),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies ICommunityPlatformMemberuser.IJoin;

  const firstUser: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: firstJoinBody,
    });
  typia.assert(firstUser);

  TestValidator.predicate(
    "first member user has non-empty username",
    firstUser.username.length > 0,
  );

  // 2. First user creates a community
  const firstCommunityBody = {
    slug: RandomGenerator.alphaNumeric(16),
    name: RandomGenerator.paragraph({ sentences: 2, wordMin: 3, wordMax: 12 }),
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

  const firstCommunity: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.memberUser.communities.create(
      connection,
      { body: firstCommunityBody },
    );
  typia.assert(firstCommunity);

  TestValidator.equals(
    "first community belongs to first member user",
    firstCommunity.owner_memberuser_id,
    firstUser.id,
  );

  // 3. Delete the first member user's profile by handle (username)
  await api.functional.communityPlatform.memberUser.profiles.erase(connection, {
    handle: firstUser.username,
  });

  // 4. Second member user joins
  const secondJoinBody = {
    username: RandomGenerator.alphabets(10),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies ICommunityPlatformMemberuser.IJoin;

  const secondUser: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: secondJoinBody,
    });
  typia.assert(secondUser);

  TestValidator.predicate(
    "second member user has non-empty username",
    secondUser.username.length > 0,
  );

  // 5. Second user creates another community
  const secondCommunityBody = {
    slug: RandomGenerator.alphaNumeric(16),
    name: RandomGenerator.paragraph({ sentences: 2, wordMin: 3, wordMax: 12 }),
    description: RandomGenerator.paragraph({
      sentences: 4,
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

  const secondCommunity: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.memberUser.communities.create(
      connection,
      { body: secondCommunityBody },
    );
  typia.assert(secondCommunity);

  TestValidator.equals(
    "second community belongs to second member user",
    secondCommunity.owner_memberuser_id,
    secondUser.id,
  );

  // 6. Ensure that first and second communities are owned by distinct users
  TestValidator.notEquals(
    "first and second member users must be distinct",
    firstUser.id,
    secondUser.id,
  );
}
