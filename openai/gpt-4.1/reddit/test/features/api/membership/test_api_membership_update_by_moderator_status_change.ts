import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityMembership } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityMembership";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";
import type { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";

/**
 * Scenario: Test moderator status change of a community member's membership.
 *
 * 1. Register and login as a moderator.
 * 2. Register a regular user and login as that user.
 * 3. As user, create a community membership for a new (random) community.
 * 4. As moderator, update the user's membership status to 'suspended', 'banned',
 *    and then back to 'active'.
 * 5. Verify that only the moderator can perform these updates and the status is
 *    correctly reflected after each change.
 * 6. Check updated_at and audit trail update on each status change.
 * 7. Optionally verify that business rules on forbidden transitions and
 *    unauthorized updates are enforced.
 */
export async function test_api_membership_update_by_moderator_status_change(
  connection: api.IConnection,
) {
  // 1. Register and login as moderator
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderatorPassword = RandomGenerator.alphaNumeric(12);
  const moderatorHref = "https://test-case.moderator/register";
  const moderatorReferrer = "https://test-case.origin";
  const moderatorStatus = "active";
  const moderator = await api.functional.auth.moderator.join(connection, {
    body: {
      email: moderatorEmail,
      password: moderatorPassword,
      status: moderatorStatus,
      href: moderatorHref,
      referrer: moderatorReferrer,
    } satisfies ICommunityPlatformModerator.ICreate,
  });
  typia.assert(moderator);

  // 2. Register and login as normal user
  const userEmail = typia.random<string & tags.Format<"email">>();
  const userPassword = RandomGenerator.alphaNumeric(10);
  const userHref = "https://test-case.user/register";
  const userReferrer = "https://test-case.origin";
  const user = await api.functional.auth.user.join(connection, {
    body: {
      email: userEmail,
      password: userPassword,
    } satisfies ICommunityPlatformUser.IJoin,
  });
  typia.assert(user);

  // Login as user (session switch)
  await api.functional.auth.user.login(connection, {
    body: {
      email: userEmail,
      password: userPassword,
      href: userHref,
      referrer: userReferrer,
    } satisfies ICommunityPlatformUser.ILogin,
  });

  // 3. User creates a membership (pick a new community name)
  const communityName = RandomGenerator.alphaNumeric(16);
  const membership =
    await api.functional.communityPlatform.user.communities.memberships.create(
      connection,
      {
        communityName,
        body: {}, // ICommunityPlatformCommunityMembership.ICreate has only optional join_request_id
      },
    );
  typia.assert(membership);

  // Moderator needs to re-login for session switch
  await api.functional.auth.moderator.login(connection, {
    body: {
      email: moderatorEmail,
      password: moderatorPassword,
      href: moderatorHref,
      referrer: moderatorReferrer,
    } satisfies ICommunityPlatformModerator.ILogin,
  });

  // 4. As moderator, try changing membership status to suspended, banned, and then active again
  const statuses = ["suspended", "banned", "active"] as const;
  let previousMembership = membership;
  for (const status of statuses) {
    const updated =
      await api.functional.communityPlatform.moderator.communities.memberships.update(
        connection,
        {
          communityName,
          membershipId: previousMembership.id,
          body: {
            status,
          } satisfies ICommunityPlatformCommunityMembership.IUpdate,
        },
      );
    typia.assert(updated);
    TestValidator.equals(
      `membership status updated to ${status}`,
      updated.status,
      status,
    );
    // updated_at must be changed
    TestValidator.predicate(
      `updated_at should update when changing status to ${status}`,
      updated.updated_at !== previousMembership.updated_at,
    );
    previousMembership = updated;
  }

  // 5. Attempt to update as user, expect failure
  await api.functional.auth.user.login(connection, {
    body: {
      email: userEmail,
      password: userPassword,
      href: userHref,
      referrer: userReferrer,
    } satisfies ICommunityPlatformUser.ILogin,
  });
  await TestValidator.error(
    "non-moderator cannot update membership status",
    async () => {
      await api.functional.communityPlatform.moderator.communities.memberships.update(
        connection,
        {
          communityName,
          membershipId: membership.id,
          body: {
            status: "banned",
          } satisfies ICommunityPlatformCommunityMembership.IUpdate,
        },
      );
    },
  );
}
