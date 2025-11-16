import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityModerator";

/**
 * Verify that community moderator registration enforces unique username and
 * email.
 *
 * Business purpose:
 *
 * - Ensure that POST /auth/communityModerator/join respects the underlying unique
 *   indexes on community_platform_communitymoderators.username and
 *   community_platform_communitymoderators.email.
 * - Confirm that attempting to reuse an existing username or email causes the
 *   join operation to fail rather than silently creating duplicate accounts.
 *
 * Scenario steps:
 *
 * 1. Create a first moderator with a unique username and email.
 * 2. Attempt to create a second moderator with the same username but a different
 *    email and assert that the API call fails.
 * 3. Attempt to create a third moderator with a different username but the same
 *    email as the first moderator and assert that the API call fails.
 * 4. Finally, create another moderator with both username and email unique to
 *    verify that the endpoint still works correctly after conflict errors.
 */
export async function test_api_community_moderator_join_enforces_unique_username_and_email(
  connection: api.IConnection,
) {
  // 1. Create the first moderator with unique credentials
  const baseUsername: string = `moderator_${RandomGenerator.alphaNumeric(12)}`;
  const baseEmail: string = `${RandomGenerator.alphaNumeric(12)}@example.com`;

  const firstJoinBody = {
    username: baseUsername,
    email: baseEmail as string & tags.Format<"email">,
    password: RandomGenerator.alphaNumeric(16),
    display_name: RandomGenerator.name(),
    ip: "192.168.0.1",
    href: "https://community.example.com/register" as string &
      tags.Format<"uri">,
    referrer: "https://community.example.com/landing" as string &
      tags.Format<"uri">,
  } satisfies ICommunityPlatformCommunityModerator.IJoin;

  const firstModerator: ICommunityPlatformCommunityModerator.IAuthorized =
    await api.functional.auth.communityModerator.join(connection, {
      body: firstJoinBody,
    });
  typia.assert<ICommunityPlatformCommunityModerator.IAuthorized>(
    firstModerator,
  );

  // 2. Attempt to register a second moderator with same username but new email
  const secondJoinBodySameUsername = {
    username: baseUsername, // duplicate username
    email: `${RandomGenerator.alphaNumeric(12)}@example.com` as string &
      tags.Format<"email">,
    password: RandomGenerator.alphaNumeric(16),
    display_name: RandomGenerator.name(),
    ip: "192.168.0.2",
    href: "https://community.example.com/register" as string &
      tags.Format<"uri">,
    referrer: "https://community.example.com/campaign" as string &
      tags.Format<"uri">,
  } satisfies ICommunityPlatformCommunityModerator.IJoin;

  await TestValidator.error("duplicate username must be rejected", async () => {
    await api.functional.auth.communityModerator.join(connection, {
      body: secondJoinBodySameUsername,
    });
  });

  // 3. Attempt to register a third moderator with new username but same email
  const thirdJoinBodySameEmail = {
    username: `moderator_${RandomGenerator.alphaNumeric(12)}`,
    email: baseEmail as string & tags.Format<"email">, // duplicate email
    password: RandomGenerator.alphaNumeric(16),
    display_name: RandomGenerator.name(),
    ip: "192.168.0.3",
    href: "https://community.example.com/register" as string &
      tags.Format<"uri">,
    referrer: "https://community.example.com/promo" as string &
      tags.Format<"uri">,
  } satisfies ICommunityPlatformCommunityModerator.IJoin;

  await TestValidator.error("duplicate email must be rejected", async () => {
    await api.functional.auth.communityModerator.join(connection, {
      body: thirdJoinBodySameEmail,
    });
  });

  // 4. Verify that a completely unique moderator can still be registered
  const fourthJoinBodyUnique = {
    username: `moderator_${RandomGenerator.alphaNumeric(12)}`,
    email: `${RandomGenerator.alphaNumeric(12)}@example.com` as string &
      tags.Format<"email">,
    password: RandomGenerator.alphaNumeric(16),
    display_name: RandomGenerator.name(),
    ip: "192.168.0.4",
    href: "https://community.example.com/register" as string &
      tags.Format<"uri">,
    referrer: "https://community.example.com/another" as string &
      tags.Format<"uri">,
  } satisfies ICommunityPlatformCommunityModerator.IJoin;

  const fourthModerator: ICommunityPlatformCommunityModerator.IAuthorized =
    await api.functional.auth.communityModerator.join(connection, {
      body: fourthJoinBodyUnique,
    });
  typia.assert<ICommunityPlatformCommunityModerator.IAuthorized>(
    fourthModerator,
  );

  // Business-level sanity check: ensure returned moderators have distinct ids
  TestValidator.notEquals(
    "first and fourth moderators must have different ids",
    firstModerator.id,
    fourthModerator.id,
  );
}
