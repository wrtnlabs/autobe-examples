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
 * Validate that a user can retrieve membership detail (including join timestamp
 * and user reference) by membershipId for a given community.
 *
 * 1. Register a new admin
 * 2. As admin, create a community
 * 3. Register a new user
 * 4. As user, join the created community to become a member
 * 5. Retrieve the community membership detail using the membershipId and
 *    communityId
 * 6. Validate the response: membership id, user reference, community reference,
 *    join timestamp, and relationship correctness
 */
export async function test_api_user_community_membership_detail_access(
  connection: api.IConnection,
) {
  // 1. Register a new admin
  const adminEmail: string = typia.random<string & tags.Format<"email">>();
  const adminDisplayName: string = RandomGenerator.name();
  const admin: ICommunityPlatformAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: RandomGenerator.alphabets(12),
        display_name: adminDisplayName,
        href: "https://admin-join.test/", // minimal valid URIs
        referrer: "https://google.com/",
      } satisfies ICommunityPlatformAdmin.ICreate,
    });
  typia.assert(admin);

  // 2. As admin, create a community
  const communityName: string = RandomGenerator.alphabets(10).toLowerCase();
  const communityDescription: string = RandomGenerator.paragraph({
    sentences: 6,
    wordMin: 5,
    wordMax: 10,
  });
  const community: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.admin.communities.create(
      connection,
      {
        body: {
          name: communityName as string &
            tags.MinLength<3> &
            tags.MaxLength<50> &
            tags.Pattern<"^[a-zA-Z0-9_]+$">,
          description: communityDescription as string &
            tags.MinLength<1> &
            tags.MaxLength<250>,
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);

  // 3. Register a new user
  const userEmail: string = typia.random<string & tags.Format<"email">>();
  const userDisplayName: string = RandomGenerator.name();
  const user: ICommunityPlatformUser.IAuthorized =
    await api.functional.auth.user.join(connection, {
      body: {
        email: userEmail,
        password: RandomGenerator.alphabets(10),
        display_name: userDisplayName,
        href: "https://user-join.test/",
        referrer: "https://facebook.com/",
      } satisfies ICommunityPlatformUser.IJoin,
    });
  typia.assert(user);

  // 4. As user, join the created community
  const membership: ICommunityPlatformCommunityMembership =
    await api.functional.communityPlatform.user.communities.memberships.create(
      connection,
      {
        communityId: community.id,
        body: {} satisfies ICommunityPlatformCommunityMembership.ICreate,
      },
    );
  typia.assert(membership);

  // 5. Retrieve the community membership detail by id
  const detail: ICommunityPlatformCommunityMembership =
    await api.functional.communityPlatform.user.communities.memberships.at(
      connection,
      {
        communityId: community.id,
        membershipId: membership.id,
      },
    );
  typia.assert(detail);

  // 6. Validate membership detail properties
  TestValidator.equals("membership id matches", detail.id, membership.id);
  TestValidator.equals(
    "community id matches",
    detail.community.id,
    community.id,
  );
  TestValidator.equals("user id matches", detail.user.id, user.id);
  TestValidator.equals(
    "user display name matches",
    detail.user.display_name,
    user.display_name,
  );
  TestValidator.predicate(
    "join timestamp is present",
    typeof detail.joined_at === "string" && detail.joined_at.length > 0,
  );
}
