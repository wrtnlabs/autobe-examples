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
 * Happy-path retrieval of a user sanction as platform admin.
 *
 * This test verifies that a platform administrator can successfully retrieve a
 * specific community-platform user sanction by its primary key after all
 * necessary domain objects (actors, community visibility level, community,
 * report, and sanction) have been created.
 *
 * Business flow:
 *
 * 1. Register a platform admin and receive tokens.
 * 2. As platform admin, create a community visibility level master record.
 * 3. Register a member user and receive tokens.
 * 4. As member user, create a community referencing the visibility level.
 * 5. As member user, create a report scoped to that community.
 * 6. Switch back to platform admin via login.
 * 7. As platform admin, create a user sanction referencing the report, sanctioned
 *    member user, and the community.
 * 8. Fetch the created sanction by id using the platform admin GET endpoint.
 * 9. Assert that all critical fields (id, report linkage, sanctioned user,
 *    community scope, sanction_type, status, effective window, and optional
 *    reason/notes) match exactly between creation and retrieval.
 */
export async function test_api_platform_admin_get_user_sanction_basic_happy_path(
  connection: api.IConnection,
) {
  // 1. Register a platform admin (join) - this also sets Authorization header.
  const adminJoinBody = {
    username: RandomGenerator.alphabets(12),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    displayName: RandomGenerator.name(),
    // ip is optional and typed as string | undefined; omit it instead of null.
    href: "https://admin-join.example.com" as string & tags.Format<"uri">,
    referrer: "https://landing.example.com" as string & tags.Format<"uri">,
  } satisfies ICommunityPlatformPlatformadmin.IJoin;

  const platformAdminAuthorized: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(platformAdminAuthorized);

  // 2. Create a community visibility level master record as platform admin.
  const visibilityCode = "public-auto-test-" + RandomGenerator.alphabets(8);
  const visibilityCreateBody = {
    code: visibilityCode,
    name: "Public Auto Test",
    description: RandomGenerator.paragraph({ sentences: 5 }),
  } satisfies ICommunityPlatformCommunityVisibilityLevel.ICreate;

  const visibilityLevel: ICommunityPlatformCommunityVisibilityLevel =
    await api.functional.communityPlatform.platformAdmin.communityVisibilityLevels.create(
      connection,
      { body: visibilityCreateBody },
    );
  typia.assert(visibilityLevel);

  // 3. Register a member user (join) - switches Authorization to member user.
  const memberPassword = RandomGenerator.alphaNumeric(16);
  const memberJoinBody = {
    username: RandomGenerator.alphabets(10),
    email: typia.random<string & tags.Format<"email">>(),
    password: memberPassword,
    ip: null,
    href: "https://member-join.example.com" as string & tags.Format<"uri">,
    referrer: "https://campaign.example.com" as string & tags.Format<"uri">,
  } satisfies ICommunityPlatformMemberuser.IJoinRequest;

  const memberAuthorized: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberJoinBody,
    });
  typia.assert(memberAuthorized);

  // 4. As member user, create a community referencing the visibility level.
  const communityIdentifier =
    "auto-community-" + RandomGenerator.alphabets(8).toLowerCase();
  const communityCreateBody = {
    identifier: communityIdentifier,
    title: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.paragraph({ sentences: 8 }),
    visibilityLevelCode: visibilityCode,
    isNsfw: false,
    primaryTagIds: undefined,
  } satisfies ICommunityPlatformCommunity.ICreate;

  const community: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.memberUser.communities.create(
      connection,
      { body: communityCreateBody },
    );
  typia.assert(community);

  // 5. As member user, create a report scoped to the created community.
  const reportCreateBody = {
    reporter_type: "member",
    report_reason_category_id: typia.random<string & tags.Format<"uuid">>(),
    community_id: community.id,
    severity: "medium",
    description: RandomGenerator.content({ paragraphs: 2 }),
  } satisfies ICommunityPlatformReport.ICreate;

  const report: ICommunityPlatformReport =
    await api.functional.communityPlatform.memberUser.reports.create(
      connection,
      { body: reportCreateBody },
    );
  typia.assert(report);

  // 6. Switch back to platform admin by logging in.
  const adminLoginBody = {
    identifier: adminJoinBody.email,
    password: adminJoinBody.password,
    ip: null,
    href: "https://admin-login.example.com" as string & tags.Format<"uri">,
    referrer: "https://admin-dashboard.example.com" as string &
      tags.Format<"uri">,
  } satisfies ICommunityPlatformPlatformadmin.ILogin;

  const platformAdminLoggedIn: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.login(connection, {
      body: adminLoginBody,
    });
  typia.assert(platformAdminLoggedIn);

  // 7. As platform admin, create a user sanction referencing the report and member.
  const effectiveFrom = new Date().toISOString() as string &
    tags.Format<"date-time">;
  const effectiveUntilDate = new Date(Date.now() + 60 * 60 * 1000); // +1 hour
  const effectiveUntil = effectiveUntilDate.toISOString() as string &
    tags.Format<"date-time">;

  const sanctionCreateBody = {
    community_platform_report_id: report.id,
    sanctioned_memberuser_id: memberAuthorized.id,
    community_id: community.id,
    sanction_type: "temporary_community_ban",
    status: "active",
    effective_from: effectiveFrom,
    effective_until: effectiveUntil,
    reason_summary: RandomGenerator.paragraph({ sentences: 4 }),
    notes_internal: RandomGenerator.content({ paragraphs: 1 }),
  } satisfies ICommunityPlatformUserSanction.ICreate;

  const createdSanction: ICommunityPlatformUserSanction =
    await api.functional.communityPlatform.platformAdmin.userSanctions.create(
      connection,
      { body: sanctionCreateBody },
    );
  typia.assert(createdSanction);

  // 8. Fetch the created sanction by id as platform admin.
  const fetchedSanction: ICommunityPlatformUserSanction =
    await api.functional.communityPlatform.platformAdmin.userSanctions.at(
      connection,
      { userSanctionId: createdSanction.id },
    );
  typia.assert(fetchedSanction);

  // 9. Validate that key fields match exactly between creation and retrieval.
  TestValidator.equals(
    "sanction id matches",
    fetchedSanction.id,
    createdSanction.id,
  );

  TestValidator.equals(
    "sanction report linkage matches",
    fetchedSanction.report.id,
    report.id,
  );

  TestValidator.equals(
    "sanctioned member user matches",
    fetchedSanction.sanctioned_memberUser.id,
    memberAuthorized.id,
  );

  TestValidator.equals(
    "sanction community scope matches",
    fetchedSanction.community ? fetchedSanction.community.id : null,
    community.id,
  );

  TestValidator.equals(
    "sanction type matches",
    fetchedSanction.sanction_type,
    createdSanction.sanction_type,
  );

  TestValidator.equals(
    "sanction status matches",
    fetchedSanction.status,
    createdSanction.status,
  );

  TestValidator.equals(
    "sanction effective_from matches",
    fetchedSanction.effective_from,
    createdSanction.effective_from,
  );

  TestValidator.equals(
    "sanction effective_until matches",
    fetchedSanction.effective_until ?? null,
    createdSanction.effective_until ?? null,
  );

  TestValidator.equals(
    "sanction reason_summary matches",
    fetchedSanction.reason_summary ?? null,
    createdSanction.reason_summary ?? null,
  );

  TestValidator.equals(
    "sanction notes_internal matches",
    fetchedSanction.notes_internal ?? null,
    createdSanction.notes_internal ?? null,
  );
}
