import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdminUserJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminUserJoin";
import type { ICommunityPlatformAdminuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminuser";
import type { ICommunityPlatformMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberuser";
import type { ICommunityPlatformModerationCase } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerationCase";
import type { ICommunityPlatformUserReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUserReport";

export async function test_api_user_report_creation_with_optional_moderation_context(
  connection: api.IConnection,
) {
  // 1. Arrange: create an adminUser A who will act as the authenticated reporter.
  const joinRequestBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
  } satisfies ICommunityPlatformAdminUserJoin.IRequest;

  const adminAuthorized: ICommunityPlatformAdminuser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: joinRequestBody,
    });
  typia.assert<ICommunityPlatformAdminuser.IAuthorized>(adminAuthorized);

  // Sanity check: token structure should be valid as well.
  typia.assert<IAuthorizationToken>(adminAuthorized.token);

  // 2. Act: create a user report as this adminUser.
  //
  // In a full system we would first create a concrete member user and
  // moderation case; however, no such endpoints are provided in this
  // scenario. The ICreate payload only allows us to specify the
  // reported_memberuser_id, reason_category, status, and severity.
  // Therefore, we generate a UUID for reported_memberuser_id to satisfy
  // the type constraints and focus assertions on fields we can control
  // directly plus relationships derived from the authenticated admin.
  const reportedMemberId = typia.random<string & tags.Format<"uuid">>();

  const requestBody = {
    reported_memberuser_id: reportedMemberId,
    reason_category: "hate",
    status: "open",
    severity: "high",
    reason_detail: RandomGenerator.paragraph({ sentences: 5 }),
  } satisfies ICommunityPlatformUserReport.ICreate;

  const created: ICommunityPlatformUserReport =
    await api.functional.communityPlatform.adminUser.userReports.create(
      connection,
      { body: requestBody },
    );
  typia.assert<ICommunityPlatformUserReport>(created);

  // 3. Assert: core scalar fields should echo the request.
  TestValidator.equals(
    "reported_memberuser_id should match input",
    created.reported_memberuser_id,
    reportedMemberId,
  );

  TestValidator.equals(
    "reason_category should match input",
    created.reason_category,
    requestBody.reason_category,
  );

  TestValidator.equals(
    "status should match input",
    created.status,
    requestBody.status,
  );

  TestValidator.equals(
    "severity should match input",
    created.severity,
    requestBody.severity,
  );

  // 4. Assert: reporter_admin should be hydrated for admin-initiated reports
  // and must reference the same admin id that was just joined.
  TestValidator.predicate(
    "reporter_admin summary must be present for admin-created report",
    created.reporter_admin !== null && created.reporter_admin !== undefined,
  );

  if (created.reporter_admin !== null && created.reporter_admin !== undefined) {
    TestValidator.equals(
      "reporter_admin.id should equal authenticated admin id",
      created.reporter_admin.id,
      adminAuthorized.id,
    );
  }

  // 5. Assert: reported_member summary, when present, should be structurally
  // valid according to its DTO shape (ISummary). We cannot assert the id
  // because we did not create a real member user; still, typia.assert has
  // already fully validated the type. Here we only perform a lightweight
  // predicate on optional fields if the relation exists.
  if (created.reported_member !== undefined) {
    typia.assert<ICommunityPlatformMemberuser.ISummary>(
      created.reported_member,
    );

    TestValidator.predicate(
      "reported_member.username should be non-empty string",
      created.reported_member.username.length > 0,
    );
  }

  // 6. Assert: assigned_admin and moderation_case relations are either null
  // or structurally valid summaries, as the linkage may be established by
  // higher-level workflows we cannot control from this endpoint.
  if (created.assigned_admin !== null && created.assigned_admin !== undefined) {
    typia.assert<ICommunityPlatformAdminuser.ISummary>(created.assigned_admin);
  }

  if (
    created.moderation_case !== null &&
    created.moderation_case !== undefined
  ) {
    typia.assert<ICommunityPlatformModerationCase.ISummary>(
      created.moderation_case,
    );
  }

  // 7. Business-level predicate: admin-based report creation should set the
  // reporter_adminuser_id foreign key, which is reflected in reporter_admin
  // summary; in addition, reason_category and severity must remain the values
  // we sent (already checked above). We enforce that the report is not
  // soft-deleted at creation time.
  TestValidator.predicate(
    "newly created report must not be soft-deleted",
    created.deleted_at === null || created.deleted_at === undefined,
  );
}
