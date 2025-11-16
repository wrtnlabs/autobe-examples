import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAccountStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAccountStatus";
import type { ICommunityPlatformActor } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformActor";
import type { ICommunityPlatformAppeal } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAppeal";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityModerator";
import type { ICommunityPlatformGuestuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformGuestuser";
import type { ICommunityPlatformMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberuser";
import type { ICommunityPlatformModerationAction } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerationAction";
import type { ICommunityPlatformPlatformadmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPlatformadmin";
import type { ICommunityPlatformReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReport";
import type { ICommunityPlatformReportReasonCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReportReasonCategory";
import type { ICommunityPlatformUserSanction } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUserSanction";

export async function test_api_platform_admin_appeal_detail_for_standalone_appeal(
  connection: api.IConnection,
) {
  // 1. Register a platform administrator (auto-authenticates as platformAdmin)
  const adminJoinBody = {
    username: RandomGenerator.alphabets(12),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphabets(16),
    displayName: RandomGenerator.name(),
    ip: RandomGenerator.alphaNumeric(8),
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/landing",
  } satisfies ICommunityPlatformPlatformadmin.IJoin;

  const adminAuthorized: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);

  const adminId: string & tags.Format<"uuid"> = adminAuthorized.id;

  // 2. Register a member user (auto-authenticates as memberUser)
  const memberJoinBody = {
    username: RandomGenerator.alphabets(10),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphabets(12),
    ip: RandomGenerator.alphaNumeric(8),
    href: "https://community.example.com/signup",
    referrer: "https://community.example.com/home",
  } satisfies ICommunityPlatformMemberuser.IJoinRequest;

  const memberAuthorized: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberJoinBody,
    });
  typia.assert(memberAuthorized);

  const memberId: string & tags.Format<"uuid"> = memberAuthorized.id;

  // 3. As member user, create a report
  const reportCreateBody = {
    reporter_type: "member",
    report_reason_category_id: typia.random<string & tags.Format<"uuid">>(),
    community_id: null,
    severity: "medium",
    description: RandomGenerator.paragraph({ sentences: 5 }),
  } satisfies ICommunityPlatformReport.ICreate;

  const createdReport: ICommunityPlatformReport =
    await api.functional.communityPlatform.memberUser.reports.create(
      connection,
      { body: reportCreateBody },
    );
  typia.assert(createdReport);

  const reportId: string & tags.Format<"uuid"> = createdReport.id;
  TestValidator.predicate("created report has valid id", !!reportId);

  // 4. As member user, create a standalone appeal via /communityPlatform/memberUser/appeals
  const appealCreateBody = {
    appeal_scope: "sanction",
    reason_summary: RandomGenerator.paragraph({ sentences: 2 }),
    details: RandomGenerator.content({ paragraphs: 2 }),
  } satisfies ICommunityPlatformAppeal.ICreate;

  const createdAppeal: ICommunityPlatformAppeal =
    await api.functional.communityPlatform.memberUser.appeals.create(
      connection,
      {
        body: appealCreateBody,
      },
    );
  typia.assert(createdAppeal);

  const appealId: string & tags.Format<"uuid"> = createdAppeal.id;

  // Basic invariants right after creation
  TestValidator.equals(
    "created appeal id is stable",
    createdAppeal.id,
    appealId,
  );
  TestValidator.equals(
    "created appeal scope matches request",
    createdAppeal.appeal_scope,
    appealCreateBody.appeal_scope,
  );
  TestValidator.equals(
    "created appeal reason summary matches request",
    createdAppeal.reason_summary,
    appealCreateBody.reason_summary,
  );

  // resolved_at should be either null or undefined for a new appeal
  TestValidator.predicate(
    "new appeal has no resolved_at timestamp",
    createdAppeal.resolved_at === null ||
      createdAppeal.resolved_at === undefined,
  );

  // Ensure the appeal is associated with the appellant member user
  TestValidator.equals(
    "appellant member summary id matches member user",
    createdAppeal.appellantMemberUser?.id,
    memberId,
  );

  // 5. Switch back to platform admin via explicit login
  const adminLoginBody = {
    identifier: adminJoinBody.email,
    password: adminJoinBody.password,
    ip: adminJoinBody.ip ?? null,
    href: adminJoinBody.href,
    referrer: adminJoinBody.referrer,
  } satisfies ICommunityPlatformPlatformadmin.ILogin;

  const adminReAuthorized: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.login(connection, {
      body: adminLoginBody,
    });
  typia.assert(adminReAuthorized);

  TestValidator.equals(
    "re-authorized admin id matches original admin",
    adminReAuthorized.id,
    adminId,
  );

  // 6. As platform admin, fetch appeal detail via platformAdmin endpoint
  const fetchedAppeal: ICommunityPlatformAppeal =
    await api.functional.communityPlatform.platformAdmin.appeals.at(
      connection,
      {
        appealId,
      },
    );
  typia.assert(fetchedAppeal);

  // Validate identity & content consistency
  TestValidator.equals(
    "fetched appeal id matches created appeal id",
    fetchedAppeal.id,
    appealId,
  );
  TestValidator.equals(
    "fetched appeal scope matches created appeal scope",
    fetchedAppeal.appeal_scope,
    createdAppeal.appeal_scope,
  );
  TestValidator.equals(
    "fetched appeal reason summary matches created appeal reason summary",
    fetchedAppeal.reason_summary,
    createdAppeal.reason_summary,
  );

  // Ensure appellant member user is correctly surfaced
  TestValidator.equals(
    "fetched appeal appellant member id matches member user",
    fetchedAppeal.appellantMemberUser?.id,
    memberId,
  );

  // Ensure created_at and updated_at are present and resolution is still unset
  TestValidator.predicate(
    "fetched appeal has created_at and updated_at timestamps",
    !!fetchedAppeal.created_at && !!fetchedAppeal.updated_at,
  );
  TestValidator.predicate(
    "fetched appeal is still unresolved",
    fetchedAppeal.resolved_at === null ||
      fetchedAppeal.resolved_at === undefined,
  );

  // Authorization negative test: unauthenticated connection must not access platformAdmin appeal detail
  const unauthenticatedConnection: api.IConnection = {
    ...connection,
    headers: {},
  };

  await TestValidator.error(
    "unauthenticated access to platformAdmin appeal detail should fail",
    async () => {
      await api.functional.communityPlatform.platformAdmin.appeals.at(
        unauthenticatedConnection,
        {
          appealId,
        },
      );
    },
  );
}
