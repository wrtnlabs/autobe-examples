import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAccountStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAccountStatus";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityMembership } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityMembership";
import type { ICommunityPlatformCommunityMembershipRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityMembershipRequest";
import type { ICommunityPlatformCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityModerator";
import type { ICommunityPlatformCommunityVisibilityLevel } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityVisibilityLevel";
import type { ICommunityPlatformMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberuser";
import type { ICommunityPlatformPlatformadmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPlatformadmin";

/**
 * Ensure that a member user cannot read another user’s community membership
 * details.
 *
 * Business workflow:
 *
 * 1. Platform admin joins and creates a community visibility level.
 * 2. Member user A joins and creates a community using that visibility level.
 * 3. Member user A submits a membership request for the community.
 * 4. Community moderator joins and creates an active membership for member user A
 *    in that community.
 * 5. Member user B joins.
 * 6. While authenticated as member user B, attempt to fetch member user A’s
 *    membership detail and expect an error.
 * 7. Log back in as member user A and successfully fetch the same membership
 *    detail, verifying ownership and correctness.
 */
export async function test_api_member_user_membership_detail_for_other_user_forbidden(
  connection: api.IConnection,
) {
  // 1. Platform admin joins
  const platformAdminEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const platformAdminHref: string & tags.Format<"uri"> =
    "https://platform-admin.join" as string & tags.Format<"uri">;
  const platformAdminReferrer: string & tags.Format<"uri"> =
    "https://platform-admin.referrer" as string & tags.Format<"uri">;

  const platformAdminJoinBody = {
    username: RandomGenerator.name(1),
    email: platformAdminEmail,
    password: "AdminPassword123!",
    displayName: RandomGenerator.name(2),
    ip: "127.0.0.1",
    href: platformAdminHref,
    referrer: platformAdminReferrer,
  } satisfies ICommunityPlatformPlatformadmin.IJoin;

  const platformAdmin: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: platformAdminJoinBody,
    });
  typia.assert(platformAdmin);

  // 2. Platform admin creates visibility level
  const visibilityCode = `public-${RandomGenerator.alphaNumeric(8)}`;
  const visibilityCreateBody = {
    code: visibilityCode,
    name: "Public Visibility",
    description: RandomGenerator.paragraph({ sentences: 3 }),
  } satisfies ICommunityPlatformCommunityVisibilityLevel.ICreate;

  const visibilityLevel: ICommunityPlatformCommunityVisibilityLevel =
    await api.functional.communityPlatform.platformAdmin.communityVisibilityLevels.create(
      connection,
      {
        body: visibilityCreateBody,
      },
    );
  typia.assert(visibilityLevel);

  // 3. Member user A joins
  const memberAEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const memberAHref: string & tags.Format<"uri"> =
    "https://member-a.join" as string & tags.Format<"uri">;
  const memberAReferrer: string & tags.Format<"uri"> =
    "https://member-a.referrer" as string & tags.Format<"uri">;

  const memberAJoinBody = {
    username: RandomGenerator.name(1),
    email: memberAEmail,
    password: "MemberAPassword123!",
    ip: "127.0.0.1",
    href: memberAHref,
    referrer: memberAReferrer,
  } satisfies ICommunityPlatformMemberuser.IJoinRequest;

  const memberA: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberAJoinBody,
    });
  typia.assert(memberA);

  // 4. Member user A creates a community
  const communityIdentifier = `community-${RandomGenerator.alphaNumeric(6)}`;
  const communityCreateBody = {
    identifier: communityIdentifier,
    title: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.paragraph({ sentences: 5 }),
    visibilityLevelCode: visibilityCode,
    isNsfw: false,
    primaryTagIds: [],
  } satisfies ICommunityPlatformCommunity.ICreate;

  const community: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.memberUser.communities.create(
      connection,
      {
        body: communityCreateBody,
      },
    );
  typia.assert(community);

  // 5. Member user A creates a membership request for the community
  const membershipRequestBody = {
    questionKey: "why_join",
    answerText: RandomGenerator.paragraph({ sentences: 3 }),
  } satisfies ICommunityPlatformCommunityMembershipRequest.ICreate;

  const membershipRequest: ICommunityPlatformCommunityMembershipRequest =
    await api.functional.communityPlatform.memberUser.communities.membershipRequests.create(
      connection,
      {
        communityIdentifier: community.identifier,
        body: membershipRequestBody,
      },
    );
  typia.assert(membershipRequest);

  // 6. Community moderator joins
  const moderatorEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const moderatorHref: string & tags.Format<"uri"> =
    "https://moderator.join" as string & tags.Format<"uri">;
  const moderatorReferrer: string & tags.Format<"uri"> =
    "https://moderator.referrer" as string & tags.Format<"uri">;

  const moderatorJoinBody = {
    username: RandomGenerator.name(1),
    email: moderatorEmail,
    password: "ModeratorPassword123!",
    display_name: RandomGenerator.name(2),
    ip: "127.0.0.1",
    href: moderatorHref,
    referrer: moderatorReferrer,
  } satisfies ICommunityPlatformCommunityModerator.IJoin;

  const moderator: ICommunityPlatformCommunityModerator.IAuthorized =
    await api.functional.auth.communityModerator.join(connection, {
      body: moderatorJoinBody,
    });
  typia.assert(moderator);

  // 7. Moderator creates an active membership for member user A
  const membershipCreateBody = {
    memberuser_id: memberA.id,
    is_active: true,
  } satisfies ICommunityPlatformCommunityMembership.ICreate;

  const membershipA: ICommunityPlatformCommunityMembership =
    await api.functional.communityPlatform.communityModerator.communities.memberships.create(
      connection,
      {
        communityIdentifier: community.identifier,
        body: membershipCreateBody,
      },
    );
  typia.assert(membershipA);

  TestValidator.equals(
    "membership belongs to member user A",
    membershipA.memberuser.id,
    memberA.id,
  );

  // 8. Member user B joins
  const memberBEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const memberBHref: string & tags.Format<"uri"> =
    "https://member-b.join" as string & tags.Format<"uri">;
  const memberBReferrer: string & tags.Format<"uri"> =
    "https://member-b.referrer" as string & tags.Format<"uri">;

  const memberBJoinBody = {
    username: RandomGenerator.name(1),
    email: memberBEmail,
    password: "MemberBPassword123!",
    ip: "127.0.0.1",
    href: memberBHref,
    referrer: memberBReferrer,
  } satisfies ICommunityPlatformMemberuser.IJoinRequest;

  const memberB: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberBJoinBody,
    });
  typia.assert(memberB);

  // 9. As member user B, attempt to fetch member user A’s membership and expect error
  await TestValidator.error(
    "other user cannot access membership detail",
    async () => {
      await api.functional.communityPlatform.memberUser.memberUsers.communityMemberships.at(
        connection,
        {
          memberUserId: memberA.id,
          membershipId: membershipA.id,
        },
      );
    },
  );

  // 10. Log back in as member user A
  const memberALoginBody = {
    identifier: memberAEmail,
    password: memberAJoinBody.password,
    ip: "127.0.0.1",
    href: memberAHref,
    referrer: memberAReferrer,
  } satisfies ICommunityPlatformMemberuser.ILoginRequest;

  const memberALogin: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.login(connection, {
      body: memberALoginBody,
    });
  typia.assert(memberALogin);

  TestValidator.equals(
    "login returns same member A id",
    memberALogin.id,
    memberA.id,
  );

  // 11. As member user A, successfully fetch membership detail
  const fetchedMembership: ICommunityPlatformCommunityMembership =
    await api.functional.communityPlatform.memberUser.memberUsers.communityMemberships.at(
      connection,
      {
        memberUserId: memberA.id,
        membershipId: membershipA.id,
      },
    );
  typia.assert(fetchedMembership);

  TestValidator.equals(
    "fetched membership id matches created membership",
    fetchedMembership.id,
    membershipA.id,
  );
  TestValidator.equals(
    "fetched membership belongs to member user A",
    fetchedMembership.memberuser.id,
    memberA.id,
  );
  TestValidator.predicate(
    "fetched membership is active",
    fetchedMembership.is_active === true,
  );
}
