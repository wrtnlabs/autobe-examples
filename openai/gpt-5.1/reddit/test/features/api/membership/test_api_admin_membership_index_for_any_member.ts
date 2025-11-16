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
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformCommunityMembership } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformCommunityMembership";

export async function test_api_admin_membership_index_for_any_member(
  connection: api.IConnection,
) {
  /**
   * 1. Register a member user A via /auth/memberUser/join.
   *
   *    - Use realistic username/email/password and required href/referrer fields.
   */
  const memberJoinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    // session context
    ip: "127.0.0.1",
    href: "https://client.example.com/signup",
    referrer: "https://client.example.com/landing",
  } satisfies ICommunityPlatformMemberuser.IJoinRequest;

  const memberUser: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberJoinBody,
    });
  typia.assert<ICommunityPlatformMemberuser.IAuthorized>(memberUser);

  /**
   * 2. Create a visibility level as platform admin so that communities can
   *    reference it.
   *
   *    - We must be authenticated as platformAdmin to call the admin visibility
   *         level API.
   *    - Join a platform admin (this will also authenticate as that admin).
   */
  const adminJoinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    displayName: RandomGenerator.name(2),
    ip: "127.0.0.1",
    href: "https://admin.example.com/signup",
    referrer: "https://admin.example.com/landing",
  } satisfies ICommunityPlatformPlatformadmin.IJoin;

  const admin: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert<ICommunityPlatformPlatformadmin.IAuthorized>(admin);

  // Create a visibility level with a unique code.
  const visibilityCode = `public-${RandomGenerator.alphaNumeric(8)}`;
  const visibilityCreateBody = {
    code: visibilityCode,
    name: "Public",
    description: RandomGenerator.paragraph({ sentences: 3 }),
  } satisfies ICommunityPlatformCommunityVisibilityLevel.ICreate;

  const visibilityLevel: ICommunityPlatformCommunityVisibilityLevel =
    await api.functional.communityPlatform.platformAdmin.communityVisibilityLevels.create(
      connection,
      {
        body: visibilityCreateBody,
      },
    );
  typia.assert<ICommunityPlatformCommunityVisibilityLevel>(visibilityLevel);

  /**
   * 3. Switch back to member user A (login) and create one or more communities
   *    under the member user context using the new visibility level code.
   */
  await api.functional.auth.memberUser.login(connection, {
    body: {
      identifier: memberJoinBody.email,
      password: memberJoinBody.password,
      ip: "127.0.0.1",
      href: "https://client.example.com/login",
      referrer: "https://client.example.com/landing",
    } satisfies ICommunityPlatformMemberuser.ILoginRequest,
  });

  const communities: ICommunityPlatformCommunity[] = await ArrayUtil.asyncMap(
    [0, 1],
    async (index) => {
      const communityIdentifier = `community-${RandomGenerator.alphaNumeric(6)}-${index}`;
      const communityCreateBody = {
        identifier: communityIdentifier,
        title: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.paragraph({ sentences: 5 }),
        visibilityLevelCode: visibilityCode,
        isNsfw: false,
        primaryTagIds: [],
      } satisfies ICommunityPlatformCommunity.ICreate;

      const community =
        await api.functional.communityPlatform.memberUser.communities.create(
          connection,
          {
            body: communityCreateBody,
          },
        );
      typia.assert<ICommunityPlatformCommunity>(community);
      return community;
    },
  );

  /**
   * 4. For at least one community, create a membership request so there is a
   *    meaningful membership-related record.
   *
   * Note: The backend may automatically create an active membership for the
   * community creator; the membership request further enriches the membership
   * dataset. We do not rely on its status semantics in this test.
   */
  const targetCommunity: ICommunityPlatformCommunity = communities[0];

  const membershipRequestBody = {
    questionKey: "join_reason",
    answerText: RandomGenerator.paragraph({ sentences: 2 }),
  } satisfies ICommunityPlatformCommunityMembershipRequest.ICreate;

  const membershipRequest: ICommunityPlatformCommunityMembershipRequest =
    await api.functional.communityPlatform.memberUser.communities.membershipRequests.create(
      connection,
      {
        communityIdentifier: targetCommunity.identifier,
        body: membershipRequestBody,
      },
    );
  typia.assert<ICommunityPlatformCommunityMembershipRequest>(membershipRequest);

  /**
   * 5. Authenticate as platform administrator again. Although join already
   *    authenticated, we call login to ensure we are using the admin context
   *    and that token switching works.
   */
  await api.functional.auth.platformAdmin.login(connection, {
    body: {
      identifier: adminJoinBody.email,
      password: adminJoinBody.password,
      ip: "127.0.0.1",
      href: "https://admin.example.com/login",
      referrer: "https://admin.example.com/landing",
    } satisfies ICommunityPlatformPlatformadmin.ILogin,
  });

  /** 6. As platform admin, call the membership index endpoint for member user A. */
  const pageRequest: ICommunityPlatformCommunityMembership.IRequest = {
    is_active: true,
    joined_from: null,
    joined_to: null,
    ended_from: null,
    ended_to: null,
    include_deleted: false,
    page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    limit: 20 as number & tags.Type<"int32"> & tags.Minimum<1>,
    sort_by: "joined_at",
    sort_direction: "desc",
  };

  const page: IPageICommunityPlatformCommunityMembership.ISummary =
    await api.functional.communityPlatform.platformAdmin.memberUsers.communityMemberships.index(
      connection,
      {
        memberUserId: memberUser.id,
        body: pageRequest,
      },
    );
  typia.assert<IPageICommunityPlatformCommunityMembership.ISummary>(page);

  /** 7. Validate pagination metadata coherence. */
  const pagination: IPage.IPagination = page.pagination;

  TestValidator.predicate(
    "pagination.current should be non-negative",
    pagination.current >= 0,
  );
  TestValidator.predicate(
    "pagination.limit should be positive when a limit was requested",
    pagination.limit > 0,
  );
  TestValidator.predicate(
    "pagination.records should be non-negative",
    pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination.pages should be non-negative",
    pagination.pages >= 0,
  );

  /** 8. Validate that all memberships belong to member user A. */
  const memberships: ICommunityPlatformCommunityMembership.ISummary[] =
    page.data;

  await ArrayUtil.asyncForEach(memberships, async (membership) => {
    TestValidator.equals(
      "each membership belongs to target member user",
      membership.memberuser.id,
      memberUser.id,
    );
  });

  /**
   * 9. Validate that at least one membership is associated with a community we
   *    created or interacted with. This confirms admin sees relevant
   *    memberships for the member user.
   */
  const communityIds = communities.map((c) => c.id);
  const matchedMembership = memberships.find((m) =>
    communityIds.includes(m.community.id),
  );

  TestValidator.predicate(
    "admin can see at least one membership tied to a community created by the member user (if memberships exist)",
    memberships.length === 0 || matchedMembership !== undefined,
  );

  /**
   * 10. When memberships exist, ensure pagination.records is at least the number of
   *     items in the current page.
   */
  if (memberships.length > 0) {
    TestValidator.predicate(
      "pagination.records is at least the number of memberships in current page",
      pagination.records >= memberships.length,
    );
  }
}
