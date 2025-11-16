import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAccountStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAccountStatus";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityMembershipRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityMembershipRequest";
import type { ICommunityPlatformCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityModerator";
import type { ICommunityPlatformCommunityVisibilityLevel } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityVisibilityLevel";
import type { ICommunityPlatformMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberuser";
import type { ICommunityPlatformPlatformadmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPlatformadmin";

/**
 * Validate that a platform administrator can delete a pending community
 * membership request using global moderation authority.
 *
 * Business flow covered:
 *
 * 1. A platform admin signs up and configures a visibility level master.
 * 2. A member user signs up and creates a community using that visibility level.
 * 3. The member user submits a membership request to the community.
 * 4. The platform admin deletes that membership request.
 * 5. A second delete attempt fails, demonstrating non-silent idempotency.
 *
 * Constraints:
 *
 * - Only the provided APIs are available, so we cannot re-read the membership
 *   request or list others. We treat successful erase without error as success
 *   and verify that a second erase produces an error via TestValidator.error.
 */
export async function test_api_membership_request_deletion_by_platform_admin_pending_request(
  connection: api.IConnection,
) {
  // 1. Register a platform admin (also establishes initial admin session)
  const platformAdminEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const platformAdminUsername: string = RandomGenerator.alphabets(12);
  const platformAdminPassword: string = RandomGenerator.alphaNumeric(16);

  const platformAdminJoin = await api.functional.auth.platformAdmin.join(
    connection,
    {
      body: {
        username: platformAdminUsername,
        email: platformAdminEmail,
        password: platformAdminPassword,
        displayName: RandomGenerator.name(),
        ip: "127.0.0.1",
        href: "https://example.com/admin/join",
        referrer: "https://example.com/landing",
      } satisfies ICommunityPlatformPlatformadmin.IJoin,
    },
  );
  typia.assert(platformAdminJoin);

  // 2. As platform admin, create a visibility level to be used by the test community
  const visibilityCode: string = `vis-${RandomGenerator.alphaNumeric(8)}`;
  const visibilityLevel: ICommunityPlatformCommunityVisibilityLevel =
    await api.functional.communityPlatform.platformAdmin.communityVisibilityLevels.create(
      connection,
      {
        body: {
          code: visibilityCode,
          name: `Visibility ${RandomGenerator.name(1)}`,
          description: RandomGenerator.paragraph({ sentences: 5 }),
        } satisfies ICommunityPlatformCommunityVisibilityLevel.ICreate,
      },
    );
  typia.assert(visibilityLevel);
  TestValidator.equals(
    "visibility level code matches input",
    visibilityLevel.code,
    visibilityCode,
  );

  // 3. Register a member user (this will switch the connection auth context)
  const memberEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const memberPassword: string = RandomGenerator.alphaNumeric(16);
  const memberUsername: string = RandomGenerator.alphabets(10);

  const memberJoin = await api.functional.auth.memberUser.join(connection, {
    body: {
      username: memberUsername,
      email: memberEmail,
      password: memberPassword,
      ip: "127.0.0.2",
      href: "https://example.com/member/join",
      referrer: "https://example.com/landing",
    } satisfies ICommunityPlatformMemberuser.IJoinRequest,
  });
  typia.assert(memberJoin);

  // 4. As member user, create a community using the created visibilityLevelCode
  const communityIdentifier: string = `community-${RandomGenerator.alphaNumeric(8)}`;
  const communityTitle: string = `Community ${RandomGenerator.name(1)}`;

  const community: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.memberUser.communities.create(
      connection,
      {
        body: {
          identifier: communityIdentifier,
          title: communityTitle,
          description: RandomGenerator.paragraph({ sentences: 8 }),
          visibilityLevelCode: visibilityCode,
          isNsfw: false,
          // omit primaryTagIds to keep test focused on core behavior
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);
  TestValidator.equals(
    "community identifier matches input",
    community.identifier,
    communityIdentifier,
  );

  // 5. As the same member user, create a membership request for that community
  const membershipRequest: ICommunityPlatformCommunityMembershipRequest =
    await api.functional.communityPlatform.memberUser.communities.membershipRequests.create(
      connection,
      {
        communityIdentifier: community.identifier,
        body: {
          questionKey: "why_join",
          answerText: RandomGenerator.paragraph({ sentences: 10 }),
        } satisfies ICommunityPlatformCommunityMembershipRequest.ICreate,
      },
    );
  typia.assert(membershipRequest);
  TestValidator.equals(
    "membership request community id matches community",
    membershipRequest.community.id,
    community.id,
  );

  // 6. Switch back to platform admin via login (restores platformAdmin auth)
  const platformAdminLogin = await api.functional.auth.platformAdmin.login(
    connection,
    {
      body: {
        identifier: platformAdminUsername,
        password: platformAdminPassword,
        ip: "127.0.0.3",
        href: "https://example.com/admin/login",
        referrer: "https://example.com/landing",
      } satisfies ICommunityPlatformPlatformadmin.ILogin,
    },
  );
  typia.assert(platformAdminLogin);

  // 7. As platform admin, delete the membership request
  await api.functional.communityPlatform.platformAdmin.communities.membershipRequests.erase(
    connection,
    {
      communityIdentifier: community.identifier,
      membershipRequestId: membershipRequest.id,
    },
  );

  // Use a predicate assertion to document that the delete completed
  TestValidator.predicate(
    "first delete of membership request completed without error",
    true,
  );

  // 8. Second delete attempt should fail (idempotent behavior via error)
  await TestValidator.error(
    "second delete attempt on already deleted membership request should fail",
    async () => {
      await api.functional.communityPlatform.platformAdmin.communities.membershipRequests.erase(
        connection,
        {
          communityIdentifier: community.identifier,
          membershipRequestId: membershipRequest.id,
        },
      );
    },
  );
}
