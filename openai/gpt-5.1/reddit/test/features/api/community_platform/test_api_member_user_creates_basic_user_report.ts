import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdminuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminuser";
import type { ICommunityPlatformMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberuser";
import type { ICommunityPlatformModerationCase } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerationCase";
import type { ICommunityPlatformUserReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUserReport";

export async function test_api_member_user_creates_basic_user_report(
  connection: api.IConnection,
) {
  // 1. Join as the initial reporter member user (reporter1)
  const reporter1JoinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    ip: null,
    href: "https://community.example.com/join" as string & tags.Format<"uri">,
    referrer: "https://community.example.com/landing" as string &
      tags.Format<"uri">,
  } satisfies ICommunityPlatformMemberuser.IJoin;

  const reporter1 = await api.functional.auth.memberUser.join(connection, {
    body: reporter1JoinBody,
  });
  typia.assert<ICommunityPlatformMemberuser.IAuthorized>(reporter1);

  // 2. Join as the target member user to be reported (target)
  const targetJoinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    ip: null,
    href: "https://community.example.com/join" as string & tags.Format<"uri">,
    referrer: "https://community.example.com/promo" as string &
      tags.Format<"uri">,
  } satisfies ICommunityPlatformMemberuser.IJoin;

  const target = await api.functional.auth.memberUser.join(connection, {
    body: targetJoinBody,
  });
  typia.assert<ICommunityPlatformMemberuser.IAuthorized>(target);

  // 3. Join as a second reporter to ensure the authenticated actor is a memberUser distinct from the target
  const reporter2JoinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    ip: null,
    href: "https://community.example.com/join" as string & tags.Format<"uri">,
    referrer: "https://community.example.com/join-flow" as string &
      tags.Format<"uri">,
  } satisfies ICommunityPlatformMemberuser.IJoin;

  const reporter2 = await api.functional.auth.memberUser.join(connection, {
    body: reporter2JoinBody,
  });
  typia.assert<ICommunityPlatformMemberuser.IAuthorized>(reporter2);

  // At this point, connection is authenticated as reporter2.

  // 4. Create a basic user report against the target member user
  const status = "open";
  const severity = "medium";

  const reportCreateBody = {
    reported_memberuser_id: target.id,
    reason_category: "harassment",
    reason_detail: RandomGenerator.paragraph({ sentences: 5 }),
    status,
    severity,
  } satisfies ICommunityPlatformUserReport.ICreate;

  const createdReport =
    await api.functional.communityPlatform.memberUser.userReports.create(
      connection,
      {
        body: reportCreateBody,
      },
    );
  typia.assert<ICommunityPlatformUserReport>(createdReport);

  // 5. Validate core persistence and actor relationships

  // 5-1. IDs and basic fields
  TestValidator.equals(
    "reported_memberuser_id should match target.id",
    createdReport.reported_memberuser_id,
    target.id,
  );

  TestValidator.equals(
    "status should reflect submitted value",
    createdReport.status,
    status,
  );

  TestValidator.equals(
    "severity should reflect submitted value",
    createdReport.severity,
    severity,
  );

  // 5-2. Reporter identity: should be the authenticated memberUser (reporter2)
  TestValidator.predicate(
    "reporter_memberuser_id should be defined for memberUser-originated report",
    createdReport.reporter_memberuser_id !== null &&
      createdReport.reporter_memberuser_id !== undefined,
  );

  TestValidator.equals(
    "reporter_memberuser_id should match reporter2.id",
    createdReport.reporter_memberuser_id!,
    reporter2.id,
  );

  TestValidator.predicate(
    "reporter_adminuser_id should be null or undefined for memberUser-originated report",
    createdReport.reporter_adminuser_id === null ||
      createdReport.reporter_adminuser_id === undefined,
  );

  // 5-3. Timestamps and deletion flag
  TestValidator.predicate(
    "created_at must be a non-empty date-time string",
    typeof createdReport.created_at === "string" &&
      createdReport.created_at.length > 0,
  );

  TestValidator.predicate(
    "updated_at must be a non-empty date-time string",
    typeof createdReport.updated_at === "string" &&
      createdReport.updated_at.length > 0,
  );

  TestValidator.predicate(
    "deleted_at should be null or undefined on freshly created report",
    createdReport.deleted_at === null || createdReport.deleted_at === undefined,
  );

  // 5-4. Related summary objects: reported_member and reporter_member
  if (createdReport.reported_member !== undefined) {
    TestValidator.equals(
      "reported_member.id should match reported_memberuser_id",
      createdReport.reported_member.id,
      createdReport.reported_memberuser_id,
    );

    TestValidator.equals(
      "reported_member.username should match target.username",
      createdReport.reported_member.username,
      target.username,
    );
  }

  if (
    createdReport.reporter_member !== undefined &&
    createdReport.reporter_member !== null
  ) {
    TestValidator.equals(
      "reporter_member.id should match reporter_memberuser_id",
      createdReport.reporter_member.id,
      createdReport.reporter_memberuser_id!,
    );
  }

  // 5-5. Admin and moderation relations should not be set for a basic memberUser-originated report
  TestValidator.predicate(
    "reporter_admin should be null or undefined on memberUser-created report",
    createdReport.reporter_admin === null ||
      createdReport.reporter_admin === undefined,
  );

  TestValidator.predicate(
    "assigned_admin should be null or undefined on initial creation",
    createdReport.assigned_admin === null ||
      createdReport.assigned_admin === undefined,
  );

  TestValidator.predicate(
    "moderation_case should be null or undefined on initial creation",
    createdReport.moderation_case === null ||
      createdReport.moderation_case === undefined,
  );
}
