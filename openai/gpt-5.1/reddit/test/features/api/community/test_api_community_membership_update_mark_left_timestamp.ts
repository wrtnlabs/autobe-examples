import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdminUserJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminUserJoin";
import type { ICommunityPlatformAdminUserLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminUserLogin";
import type { ICommunityPlatformAdminuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminuser";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityMembership } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityMembership";
import type { ICommunityPlatformMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberuser";

/**
 * Validate adminUser can mark and adjust membership leftAt timestamp.
 *
 * Business workflow:
 *
 * 1. Create an adminUser (join) and remember its credentials.
 * 2. Create a memberUser (join) and rely on SDK to authenticate as that member.
 * 3. As the memberUser, create a community and capture its slug.
 * 4. As the memberUser, create a membership in that community and capture its id
 *    and initial timestamps.
 * 5. Switch back to the adminUser via login so that admin-only endpoints are
 *    authorized.
 * 6. As adminUser, update the membership via the admin endpoint to set leftAt to a
 *    specific ISO timestamp and align approval/ban flags.
 * 7. Validate that leftAt is set, identity fields are unchanged, and updatedAt has
 *    advanced.
 * 8. Perform a second admin update to change leftAt to a different timestamp
 *    (simulating an administrative correction) and verify that the change is
 *    persisted and updatedAt advances again.
 */
export async function test_api_community_membership_update_mark_left_timestamp(
  connection: api.IConnection,
) {
  // 1. Register adminUser (join)
  const adminUsername = RandomGenerator.alphabets(12);
  const adminEmail = `${adminUsername}@admin.example.com`;
  const adminPassword = "AdminPassw0rd!";

  const adminJoinOutput = await api.functional.auth.adminUser.join(connection, {
    body: {
      username: adminUsername,
      email: adminEmail as string & tags.Format<"email">,
      password: "AdminPassw0rd!" as string & tags.Format<"password">,
    } satisfies ICommunityPlatformAdminUserJoin.IRequest,
  });
  typia.assert<ICommunityPlatformAdminuser.IAuthorized>(adminJoinOutput);

  // 2. Register memberUser (join) - this also switches Authorization to memberUser
  const memberUsername = RandomGenerator.alphabets(12);
  const memberEmail = `${memberUsername}@member.example.com`;
  const memberPassword = "MemberPassw0rd!";

  const memberJoinOutput = await api.functional.auth.memberUser.join(
    connection,
    {
      body: {
        username: memberUsername as string &
          tags.MinLength<3> &
          tags.MaxLength<32>,
        email: memberEmail as string & tags.Format<"email">,
        password: memberPassword as string & tags.MinLength<8>,
        ip: null,
        href: "https://community.example.com/register" as string &
          tags.Format<"uri">,
        referrer: "https://community.example.com/landing" as string &
          tags.Format<"uri">,
      } satisfies ICommunityPlatformMemberuser.IJoin,
    },
  );
  typia.assert<ICommunityPlatformMemberuser.IAuthorized>(memberJoinOutput);

  // 3. As memberUser, create a community
  const communitySlug =
    `community-${RandomGenerator.alphaNumeric(8)}` as string &
      tags.MinLength<1> &
      tags.MaxLength<128>;

  const communityCreateBody = {
    slug: communitySlug,
    name: RandomGenerator.paragraph({ sentences: 2 }) as string &
      tags.MinLength<1> &
      tags.MaxLength<255>,
    description: RandomGenerator.paragraph({ sentences: 5 }) as string &
      tags.MaxLength<4000>,
    visibility: "public",
    status: "active",
    is_nsfw: false,
    is_quarantined: false,
    is_posting_restricted: false,
    allow_text_posts: true,
    allow_link_posts: true,
    allow_image_posts: true,
  } satisfies ICommunityPlatformCommunity.ICreate;

  const community =
    await api.functional.communityPlatform.memberUser.communities.create(
      connection,
      { body: communityCreateBody },
    );
  typia.assert<ICommunityPlatformCommunity>(community);

  TestValidator.equals(
    "created community slug should match requested slug",
    community.slug,
    communitySlug,
  );

  // 4. As memberUser, create a membership in that community
  const membershipCreateBody = {
    role: "member",
  } satisfies ICommunityPlatformCommunityMembership.ICreate;

  const membership =
    await api.functional.communityPlatform.memberUser.communities.memberships.create(
      connection,
      {
        communitySlug: community.slug,
        body: membershipCreateBody,
      },
    );
  typia.assert<ICommunityPlatformCommunityMembership>(membership);

  TestValidator.equals(
    "membership community slug should match community",
    membership.community.slug,
    community.slug,
  );
  TestValidator.equals(
    "membership memberUser id should match member join id",
    membership.memberUser.id,
    memberJoinOutput.id,
  );

  const originalUpdatedAt = membership.updatedAt;

  // 5. Switch back to adminUser via login
  const adminLoginOutput = await api.functional.auth.adminUser.login(
    connection,
    {
      body: {
        identifier: adminUsername,
        password: adminPassword,
        ip: null,
        href: "https://community.example.com/admin/login" as string &
          tags.Format<"uri">,
        referrer: "https://community.example.com/admin" as string &
          tags.Format<"uri">,
      } satisfies ICommunityPlatformAdminUserLogin.IRequest,
    },
  );
  typia.assert<ICommunityPlatformAdminuser.IAuthorized>(adminLoginOutput);

  // 6. As adminUser, update membership to set leftAt
  const firstLeftAt = new Date().toISOString() as string &
    tags.Format<"date-time">;

  const firstUpdateBody = {
    isApproved: true,
    isBanned: false,
    leftAt: firstLeftAt,
  } satisfies ICommunityPlatformCommunityMembership.IUpdate;

  const updatedOnce =
    await api.functional.communityPlatform.adminUser.communities.memberships.update(
      connection,
      {
        communitySlug: community.slug,
        membershipId: membership.id,
        body: firstUpdateBody,
      },
    );
  typia.assert<ICommunityPlatformCommunityMembership>(updatedOnce);

  TestValidator.equals(
    "first update: membership id should remain the same",
    updatedOnce.id,
    membership.id,
  );
  TestValidator.equals(
    "first update: community slug should remain the same",
    updatedOnce.community.slug,
    community.slug,
  );
  TestValidator.equals(
    "first update: memberUser id should remain the same",
    updatedOnce.memberUser.id,
    membership.memberUser.id,
  );
  TestValidator.equals(
    "first update: leftAt should match requested timestamp",
    updatedOnce.leftAt,
    firstLeftAt,
  );
  TestValidator.notEquals(
    "first update: updatedAt should change after update",
    updatedOnce.updatedAt,
    originalUpdatedAt,
  );

  // 7. Perform a second admin update to change leftAt again
  const secondLeftAt = new Date(Date.now() + 60_000).toISOString() as string &
    tags.Format<"date-time">;

  const secondUpdateBody = {
    leftAt: secondLeftAt,
  } satisfies ICommunityPlatformCommunityMembership.IUpdate;

  const updatedTwice =
    await api.functional.communityPlatform.adminUser.communities.memberships.update(
      connection,
      {
        communitySlug: community.slug,
        membershipId: membership.id,
        body: secondUpdateBody,
      },
    );
  typia.assert<ICommunityPlatformCommunityMembership>(updatedTwice);

  TestValidator.equals(
    "second update: leftAt should be updated to new timestamp",
    updatedTwice.leftAt,
    secondLeftAt,
  );
  TestValidator.equals(
    "second update: membership id remains stable",
    updatedTwice.id,
    membership.id,
  );
  TestValidator.equals(
    "second update: community slug remains stable",
    updatedTwice.community.slug,
    community.slug,
  );
  TestValidator.equals(
    "second update: memberUser id remains stable",
    updatedTwice.memberUser.id,
    membership.memberUser.id,
  );
  TestValidator.notEquals(
    "second update: updatedAt should change again",
    updatedTwice.updatedAt,
    updatedOnce.updatedAt,
  );
}
