import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformKarmaPenalty } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformKarmaPenalty";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";
import type { ICommunityPlatformSubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformSubscription";

/**
 * Test permanent deletion of a karma penalty record by an admin.
 *
 * Steps:
 *
 * 1. Register a new admin (who will execute the deletion).
 * 2. Register a member (who will be penalized), log in as member.
 * 3. Create a community as the member.
 * 4. Subscribe the member to the community.
 * 5. Register another new member (password known) for moderator use, and join as
 *    moderator in the community.
 * 6. Impose a karma penalty by the moderator to the member.
 * 7. As admin (re-authenticate), delete the penalty using the admin API.
 * 8. Attempt to delete a non-existent penalty (confirm error).
 * 9. Attempt to delete as a non-admin (should error).
 */
export async function test_api_karma_penalty_deletion_by_admin(
  connection: api.IConnection,
) {
  // 1. Register new admin
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphaNumeric(10);
  const admin: ICommunityPlatformAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: adminPassword,
      } satisfies ICommunityPlatformAdmin.ICreate,
    });
  typia.assert(admin);

  // 2. Register a member (to be penalized) and login as this member
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = RandomGenerator.alphaNumeric(10);
  const member: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: memberEmail,
        password: memberPassword,
      } satisfies ICommunityPlatformMember.ICreate,
    });
  typia.assert(member);

  // 3. As member, create a community
  const community: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: {
          name: RandomGenerator.name(1),
          title: RandomGenerator.name(2),
          description: RandomGenerator.paragraph({ sentences: 10 }),
          slug: RandomGenerator.alphaNumeric(12),
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);

  // 4. Member subscribes to the community
  const subscription: ICommunityPlatformSubscription =
    await api.functional.communityPlatform.member.subscriptions.create(
      connection,
      {
        body: {
          community_id: community.id,
        } satisfies ICommunityPlatformSubscription.ICreate,
      },
    );
  typia.assert(subscription);

  // 5. Register another member for moderator use
  const modEmail = typia.random<string & tags.Format<"email">>();
  const modPassword = RandomGenerator.alphaNumeric(10);
  const modMember: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: modEmail,
        password: modPassword,
      } satisfies ICommunityPlatformMember.ICreate,
    });
  typia.assert(modMember);

  // 5b. Register as moderator with this new member in the created community
  const moderator: ICommunityPlatformModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: modEmail,
        password: modPassword,
        community_id: community.id,
      } satisfies ICommunityPlatformModerator.IJoin,
    });
  typia.assert(moderator);

  // 6. As moderator, create a karma penalty for the first member
  const penaltyPayload = {
    community_platform_member_id: member.id,
    community_platform_community_id: community.id,
    penalty_type: "deduction",
    penalty_value: -10,
    penalty_reason: RandomGenerator.paragraph({ sentences: 5 }),
    penalty_status: "active",
    applied_at: new Date().toISOString(),
    expires_at: null,
  } satisfies ICommunityPlatformKarmaPenalty.ICreate;
  const penalty: ICommunityPlatformKarmaPenalty =
    await api.functional.communityPlatform.moderator.karmaPenalties.create(
      connection,
      {
        body: penaltyPayload,
      },
    );
  typia.assert(penalty);

  // 7. Re-authenticate as admin for deletion
  await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
    } satisfies ICommunityPlatformAdmin.ICreate,
  });

  // 8. Delete the penalty as admin
  await api.functional.communityPlatform.admin.karmaPenalties.erase(
    connection,
    {
      karmaPenaltyId: penalty.id,
    },
  );
  // Penalty is deleted. (No retrieval API is present)

  // 9. Attempt to delete again (non-existent): should error
  await TestValidator.error(
    "deleting non-existent penalty should error",
    async () => {
      await api.functional.communityPlatform.admin.karmaPenalties.erase(
        connection,
        {
          karmaPenaltyId: penalty.id,
        },
      );
    },
  );

  // 10. Attempt to delete as non-admin (logout as admin and login as regular member)
  await api.functional.auth.member.join(connection, {
    body: {
      email: memberEmail,
      password: memberPassword,
    } satisfies ICommunityPlatformMember.ICreate,
  });
  await TestValidator.error(
    "should not allow member to delete penalty",
    async () => {
      await api.functional.communityPlatform.admin.karmaPenalties.erase(
        connection,
        {
          karmaPenaltyId: penalty.id,
        },
      );
    },
  );
}
