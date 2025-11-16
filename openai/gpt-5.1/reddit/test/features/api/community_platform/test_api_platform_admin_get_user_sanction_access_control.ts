import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAccountStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAccountStatus";
import type { ICommunityPlatformActor } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformActor";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityVisibilityLevel } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityVisibilityLevel";
import type { ICommunityPlatformGuestuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformGuestuser";
import type { ICommunityPlatformMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberuser";
import type { ICommunityPlatformPlatformadmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPlatformadmin";
import type { ICommunityPlatformReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReport";
import type { ICommunityPlatformReportReasonCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReportReasonCategory";
import type { ICommunityPlatformUserSanction } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUserSanction";

/**
 * Verify access control for GET
 * /communityPlatform/platformAdmin/userSanctions/{userSanctionId}.
 *
 * Business goals:
 *
 * - A platformAdmin actor can retrieve a specific user sanction record by ID.
 * - Unauthenticated callers must be rejected and must not see sanction payloads.
 * - Authenticated non-admin memberUser actors must also be rejected.
 *
 * High level steps:
 *
 * 1. Create platformAdmin via /auth/platformAdmin/join (admin token established).
 * 2. Create memberUser via /auth/memberUser/join and login.
 * 3. As platformAdmin, create a visibility level.
 * 4. As memberUser, create a community using that visibility level.
 * 5. As memberUser, create a report scoped to the community.
 * 6. As platformAdmin, create a user sanction referencing the report, memberUser,
 *    and community.
 * 7. As platformAdmin, GET the sanction by id and verify its contents.
 * 8. With an unauthenticated connection, attempt the same GET and expect an error.
 * 9. As memberUser, attempt the same GET and expect an error.
 */
export async function test_api_platform_admin_get_user_sanction_access_control(
  connection: api.IConnection,
) {
  // 1. Register a platform admin (this sets Authorization to admin token)
  const adminJoinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: "AdminPassw0rd!",
    displayName: RandomGenerator.name(),
    ip: undefined,
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/landing",
  } satisfies ICommunityPlatformPlatformadmin.IJoin;

  const adminAuthorizedFromJoin: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorizedFromJoin);

  const adminEmail: string = adminAuthorizedFromJoin.email;

  // 2. Register and login a member user
  const memberJoinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: "MemberPassw0rd!",
    ip: null,
    href: "https://app.example.com/join",
    referrer: "https://app.example.com/home",
  } satisfies ICommunityPlatformMemberuser.IJoinRequest;

  const memberAuthorizedFromJoin: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberJoinBody,
    });
  typia.assert(memberAuthorizedFromJoin);

  const memberId: string & tags.Format<"uuid"> = memberAuthorizedFromJoin.id;
  const memberEmail: string & tags.Format<"email"> =
    memberAuthorizedFromJoin.email;

  const memberLoginBody = {
    identifier: memberEmail,
    password: memberJoinBody.password,
    ip: null,
    href: "https://app.example.com/login",
    referrer: "https://app.example.com/home",
  } satisfies ICommunityPlatformMemberuser.ILoginRequest;

  const memberAuthorizedFromLogin: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.login(connection, {
      body: memberLoginBody,
    });
  typia.assert(memberAuthorizedFromLogin);

  // 3. As platformAdmin, create a visibility level for communities
  const adminLoginBody = {
    identifier: adminEmail,
    password: adminJoinBody.password,
    ip: null,
    href: "https://admin.example.com/login",
    referrer: "https://admin.example.com/landing",
  } satisfies ICommunityPlatformPlatformadmin.ILogin;

  const adminAuthorizedFromLogin: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.login(connection, {
      body: adminLoginBody,
    });
  typia.assert(adminAuthorizedFromLogin);

  const visibilityCode = "public_" + RandomGenerator.alphaNumeric(6);

  const visibilityCreateBody = {
    code: visibilityCode,
    name: "Public Visibility " + RandomGenerator.name(1),
    description: RandomGenerator.paragraph({ sentences: 4 }),
  } satisfies ICommunityPlatformCommunityVisibilityLevel.ICreate;

  const visibilityLevel: ICommunityPlatformCommunityVisibilityLevel =
    await api.functional.communityPlatform.platformAdmin.communityVisibilityLevels.create(
      connection,
      {
        body: visibilityCreateBody,
      },
    );
  typia.assert(visibilityLevel);

  // 4. As memberUser, create a community using the visibility level
  const memberAuthorizedForCommunity: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.login(connection, {
      body: memberLoginBody,
    });
  typia.assert(memberAuthorizedForCommunity);

  const communityIdentifier =
    "community_" + RandomGenerator.alphaNumeric(8).toLowerCase();

  const communityCreateBody = {
    identifier: communityIdentifier,
    title: "Test Community " + RandomGenerator.name(1),
    description: RandomGenerator.paragraph({ sentences: 6 }),
    visibilityLevelCode: visibilityLevel.code,
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

  // 5. As memberUser, create a report scoped to the community
  const reportCreateBody = {
    reporter_type: "member",
    report_reason_category_id: typia.random<string & tags.Format<"uuid">>(),
    community_id: community.id,
    severity: "medium",
    description: RandomGenerator.paragraph({ sentences: 5 }),
  } satisfies ICommunityPlatformReport.ICreate;

  const report: ICommunityPlatformReport =
    await api.functional.communityPlatform.memberUser.reports.create(
      connection,
      {
        body: reportCreateBody,
      },
    );
  typia.assert(report);

  // 6. As platformAdmin, create a user sanction referencing the report
  const adminAuthorizedForSanction: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.login(connection, {
      body: adminLoginBody,
    });
  typia.assert(adminAuthorizedForSanction);

  const now = new Date();
  const effectiveFrom = now.toISOString();
  const effectiveUntil = new Date(
    now.getTime() + 24 * 60 * 60 * 1000,
  ).toISOString();

  const userSanctionCreateBody = {
    community_platform_report_id: report.id,
    sanctioned_memberuser_id: memberId,
    community_id: community.id,
    sanction_type: "temporary_community_ban",
    status: "active",
    effective_from: effectiveFrom,
    effective_until: effectiveUntil,
    reason_summary: "Test sanction for access control validation",
    notes_internal: "Internal notes for E2E access control test",
  } satisfies ICommunityPlatformUserSanction.ICreate;

  const createdSanction: ICommunityPlatformUserSanction =
    await api.functional.communityPlatform.platformAdmin.userSanctions.create(
      connection,
      {
        body: userSanctionCreateBody,
      },
    );
  typia.assert(createdSanction);

  const userSanctionId: string & tags.Format<"uuid"> = createdSanction.id;

  // 7. Authorized GET by platformAdmin
  const adminAuthorizedForGet: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.login(connection, {
      body: adminLoginBody,
    });
  typia.assert(adminAuthorizedForGet);

  const fetchedSanction: ICommunityPlatformUserSanction =
    await api.functional.communityPlatform.platformAdmin.userSanctions.at(
      connection,
      {
        userSanctionId,
      },
    );
  typia.assert(fetchedSanction);

  TestValidator.equals(
    "sanction id should match created id",
    fetchedSanction.id,
    createdSanction.id,
  );
  TestValidator.equals(
    "sanction report id should match",
    fetchedSanction.report.id,
    createdSanction.report.id,
  );
  TestValidator.equals(
    "sanctioned member user id should match",
    fetchedSanction.sanctioned_memberUser.id,
    createdSanction.sanctioned_memberUser.id,
  );
  TestValidator.equals(
    "sanction community id should match",
    fetchedSanction.community?.id ?? null,
    createdSanction.community?.id ?? null,
  );
  TestValidator.equals(
    "sanction type should match",
    fetchedSanction.sanction_type,
    userSanctionCreateBody.sanction_type,
  );
  TestValidator.equals(
    "sanction status should match",
    fetchedSanction.status,
    userSanctionCreateBody.status,
  );
  TestValidator.equals(
    "sanction effective_from should match",
    fetchedSanction.effective_from,
    userSanctionCreateBody.effective_from,
  );
  TestValidator.equals(
    "sanction effective_until should match",
    fetchedSanction.effective_until ?? null,
    userSanctionCreateBody.effective_until ?? null,
  );

  // 8. Unauthenticated GET must fail
  const unauthenticatedConnection: api.IConnection = {
    ...connection,
    headers: {},
  };

  await TestValidator.error(
    "unauthenticated access to user sanction must fail",
    async () => {
      await api.functional.communityPlatform.platformAdmin.userSanctions.at(
        unauthenticatedConnection,
        {
          userSanctionId,
        },
      );
    },
  );

  // 9. memberUser-authenticated GET must fail
  const memberAuthorizedForForbiddenGet: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.login(connection, {
      body: memberLoginBody,
    });
  typia.assert(memberAuthorizedForForbiddenGet);

  await TestValidator.error(
    "memberUser must not be able to read platform admin user sanctions",
    async () => {
      await api.functional.communityPlatform.platformAdmin.userSanctions.at(
        connection,
        {
          userSanctionId,
        },
      );
    },
  );
}
