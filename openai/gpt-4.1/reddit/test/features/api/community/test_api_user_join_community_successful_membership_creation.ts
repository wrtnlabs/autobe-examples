import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityMembership } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityMembership";
import type { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";

/**
 * Test successful user joining of an existing community; covers admin community
 * creation, user registration, and membership creation logic.
 */
export async function test_api_user_join_community_successful_membership_creation(
  connection: api.IConnection,
) {
  // 1. Register and authenticate admin to create a community
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const admin: ICommunityPlatformAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: RandomGenerator.alphaNumeric(12),
        display_name: RandomGenerator.name(),
        href: "https://admin.registration-flow.example/autobe/join",
        referrer: "https://admin.registration-referrer.example/autobe",
        ip: null,
      } satisfies ICommunityPlatformAdmin.ICreate,
    });
  typia.assert(admin);

  // 2. Admin creates a new community
  const community: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.admin.communities.create(
      connection,
      {
        body: {
          name: RandomGenerator.alphaNumeric(8).toLowerCase(),
          description: RandomGenerator.paragraph({
            sentences: 5,
            wordMin: 4,
            wordMax: 10,
          }),
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);

  // 3. Register and authenticate as a new user
  const userEmail = typia.random<string & tags.Format<"email">>();
  const userPassword = RandomGenerator.alphaNumeric(10);
  const userDisplayName = RandomGenerator.name(2);
  const user: ICommunityPlatformUser.IAuthorized =
    await api.functional.auth.user.join(connection, {
      body: {
        email: userEmail,
        password: userPassword,
        display_name: userDisplayName,
        href: "https://user.registration-flow.example/autobe/join",
        referrer: "https://user.registration-referrer.example/autobe",
        ip: null,
      } satisfies ICommunityPlatformUser.IJoin,
    });
  typia.assert(user);

  // 4. User attempts to join the created community
  const membership: ICommunityPlatformCommunityMembership =
    await api.functional.communityPlatform.user.communities.memberships.create(
      connection,
      {
        communityId: community.id,
        body: {} satisfies ICommunityPlatformCommunityMembership.ICreate,
      },
    );
  typia.assert(membership);

  // 5. Assertions: validate membership record has correct user/community refs and join timestamp
  TestValidator.equals(
    "membership references correct user ID",
    membership.user.id,
    user.id,
  );
  TestValidator.equals(
    "membership references correct user display name",
    membership.user.display_name,
    user.display_name,
  );
  TestValidator.equals(
    "membership references correct community ID",
    membership.community.id,
    community.id,
  );
  TestValidator.equals(
    "membership references correct community name",
    membership.community.name,
    community.name,
  );
  TestValidator.equals(
    "membership references correct community description",
    membership.community.description,
    community.description,
  );
  TestValidator.predicate(
    "membership join timestamp is ISO 8601",
    ((): boolean => {
      // Simple ISO 8601 date-time check
      return /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(membership.joined_at);
    })(),
  );
}
