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
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformCommunityMembershipRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformCommunityMembershipRequest";

export async function test_api_platform_admin_membership_requests_listing_basic_flow(
  connection: api.IConnection,
) {
  // 1. Prepare shared random data for URIs and passwords
  const platformAdminPassword = "AdminPw#1";
  const memberUserPassword = "MemberPw#1";

  const baseHref = "https://example.com" as const;

  const adminJoinHref = `${baseHref}/admin/join`;
  const adminJoinReferrer = `${baseHref}/landing`;

  const adminLoginHref = `${baseHref}/admin/login`;
  const adminLoginReferrer = `${baseHref}/landing`;

  const memberJoinHref = `${baseHref}/member/join`;
  const memberJoinReferrer = `${baseHref}/landing`;

  const memberLoginHref = `${baseHref}/member/login`;
  const memberLoginReferrer = `${baseHref}/landing`;

  // 2. Platform admin joins (creates admin account and authenticates)
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminUsername = RandomGenerator.alphabets(12);

  const platformAdminAuthorized: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: {
        username: adminUsername,
        email: adminEmail,
        password: platformAdminPassword,
        displayName: RandomGenerator.name(),
        ip: "127.0.0.1",
        href: adminJoinHref as string & tags.Format<"uri">,
        referrer: adminJoinReferrer as string & tags.Format<"uri">,
      } satisfies ICommunityPlatformPlatformadmin.IJoin,
    });
  typia.assert(platformAdminAuthorized);

  // 3. Platform admin creates a community visibility level
  const visibilityCode = `vis-${RandomGenerator.alphabets(8)}`;

  const visibilityLevel: ICommunityPlatformCommunityVisibilityLevel =
    await api.functional.communityPlatform.platformAdmin.communityVisibilityLevels.create(
      connection,
      {
        body: {
          code: visibilityCode,
          name: RandomGenerator.name(2),
          description: RandomGenerator.paragraph({ sentences: 5 }),
        } satisfies ICommunityPlatformCommunityVisibilityLevel.ICreate,
      },
    );
  typia.assert(visibilityLevel);

  // 4. Member user joins
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberUsernameRaw = RandomGenerator.alphabets(10);

  const memberAuthorized: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: {
        username: memberUsernameRaw,
        email: memberEmail,
        password: memberUserPassword,
        ip: null,
        href: memberJoinHref as string & tags.Format<"uri">,
        referrer: memberJoinReferrer as string & tags.Format<"uri">,
      } satisfies ICommunityPlatformMemberuser.IJoinRequest,
    });
  typia.assert(memberAuthorized);

  const memberUserId = memberAuthorized.id;

  // 5. Member user logs in explicitly (actor switching helper)
  const memberLoginAuthorized: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.login(connection, {
      body: {
        identifier: memberEmail,
        password: memberUserPassword,
        ip: null,
        href: memberLoginHref as string & tags.Format<"uri">,
        referrer: memberLoginReferrer as string & tags.Format<"uri">,
      } satisfies ICommunityPlatformMemberuser.ILoginRequest,
    });
  typia.assert(memberLoginAuthorized);

  // 6. Member user creates a community using the created visibility level code
  const communityIdentifier = `comm-${RandomGenerator.alphabets(10)}`;

  const community: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.memberUser.communities.create(
      connection,
      {
        body: {
          identifier: communityIdentifier,
          title: RandomGenerator.paragraph({ sentences: 3 }),
          description: RandomGenerator.paragraph({ sentences: 8 }),
          visibilityLevelCode: visibilityCode,
          isNsfw: false,
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);

  // Ensure basic invariants of created community
  TestValidator.equals(
    "community identifier should match input",
    community.identifier,
    communityIdentifier,
  );

  // 7. Member user creates a membership request to that community
  const membershipRequest: ICommunityPlatformCommunityMembershipRequest =
    await api.functional.communityPlatform.memberUser.communities.membershipRequests.create(
      connection,
      {
        communityIdentifier: community.identifier,
        body: {
          questionKey: "join_reason",
          answerText: RandomGenerator.paragraph({ sentences: 6 }),
        } satisfies ICommunityPlatformCommunityMembershipRequest.ICreate,
      },
    );
  typia.assert(membershipRequest);

  // Basic checks for created membership request
  TestValidator.equals(
    "membership request community id should match community",
    membershipRequest.community.id,
    community.id,
  );
  TestValidator.equals(
    "membership request requester id should match member user",
    membershipRequest.requesterMemberUser.id,
    memberUserId,
  );

  // 8. Switch back to platform admin context via login
  const platformAdminLoginAuthorized: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.login(connection, {
      body: {
        identifier: adminEmail,
        password: platformAdminPassword,
        ip: null,
        href: adminLoginHref as string & tags.Format<"uri">,
        referrer: adminLoginReferrer as string & tags.Format<"uri">,
      } satisfies ICommunityPlatformPlatformadmin.ILogin,
    });
  typia.assert(platformAdminLoginAuthorized);

  // 9. Platform admin lists membership requests for the community with minimal filters
  const page: IPageICommunityPlatformCommunityMembershipRequest.ISummary =
    await api.functional.communityPlatform.platformAdmin.communities.membershipRequests.index(
      connection,
      {
        communityIdentifier: community.identifier,
        body: {},
      },
    );
  typia.assert(page);

  // 10. Validate that at least one membership request is returned
  TestValidator.predicate(
    "membership requests list should contain at least one item",
    page.data.length >= 1,
  );

  // 11. Validate all returned summaries refer to the correct community
  const allMatchCommunity = page.data.every(
    (summary) => summary.community.id === community.id,
  );
  TestValidator.predicate(
    "all membership request summaries should belong to the created community",
    allMatchCommunity,
  );

  // 12. Validate that at least one membership request corresponds to our created request and member user
  const found = page.data.find(
    (summary) => summary.id === membershipRequest.id,
  );

  TestValidator.predicate(
    "listed membership requests should contain the created request",
    found !== undefined,
  );

  if (found !== undefined) {
    TestValidator.equals(
      "found membership request community id matches community",
      found.community.id,
      community.id,
    );
    TestValidator.equals(
      "found membership request requester id matches member user",
      found.requester.id,
      memberUserId,
    );
  }
}
