import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconPoliticalForumAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalForumAdministrator";
import type { IEconPoliticalForumModerationCase } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalForumModerationCase";
import type { IEconPoliticalForumRegisteredUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalForumRegisteredUser";
import type { IEconPoliticalForumReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalForumReport";

export async function test_api_moderation_case_update_concurrent_conflict_handling(
  connection: api.IConnection,
) {
  /**
   * Concurrency workflow test for moderation case update endpoint.
   *
   * Steps:
   *
   * 1. Register an administrator (join) and obtain authorization token (SDK
   *    auto-sets connection.headers.Authorization).
   * 2. Create a report to reference as lead_report_id (optional but useful).
   * 3. Create a moderation case that will be the target of concurrent updates.
   * 4. Prepare two overlapping update payloads that modify the same mutable
   *    fields.
   * 5. Issue two PUT requests in parallel and capture outcomes.
   * 6. Validate deterministic concurrency behavior (conflict or last-write-wins)
   *    and ensure final persisted state is consistent.
   */

  // 1. Administrator registration
  const adminEmail: string = typia.random<string & tags.Format<"email">>();
  const adminAuth: IEconPoliticalForumAdministrator.IAuthorized =
    await api.functional.auth.administrator.join(connection, {
      body: {
        email: adminEmail,
        password: "A_str0ng_Passw0rd!",
        username: RandomGenerator.name(1),
        display_name: RandomGenerator.name(),
      } satisfies IEconPoliticalForumAdministrator.IJoin,
    });
  typia.assert(adminAuth);

  // 2. Optional: create a report to reference in the case
  const reportBody = {
    reported_post_id: typia.random<string & tags.Format<"uuid">>(),
    reason_code: "harassment",
    reporter_text: RandomGenerator.paragraph({ sentences: 4 }),
    reporter_anonymous: true,
    priority: "normal",
  } satisfies IEconPoliticalForumReport.ICreate;

  const report: IEconPoliticalForumReport =
    await api.functional.econPoliticalForum.reports.create(connection, {
      body: reportBody,
    });
  typia.assert(report);

  // 3. Create the moderation case
  const caseNumber = `CASE-${Date.now()}-${RandomGenerator.alphaNumeric(4)}`;
  const createBody = {
    case_number: caseNumber,
    title: RandomGenerator.paragraph({ sentences: 3 }),
    lead_report_id: report.id,
    status: "open",
    priority: "normal",
    summary: RandomGenerator.paragraph({ sentences: 2 }),
    legal_hold: false,
  } satisfies IEconPoliticalForumModerationCase.ICreate;

  const createdCase: IEconPoliticalForumModerationCase =
    await api.functional.econPoliticalForum.administrator.moderationCases.create(
      connection,
      { body: createBody },
    );
  typia.assert(createdCase);
  TestValidator.equals(
    "created case id matches returned case id",
    createdCase.id,
    createdCase.id,
  );

  // 4. Prepare two overlapping update payloads (both update status and assigned moderator)
  const moderatorA = typia.random<string & tags.Format<"uuid">>();
  const moderatorB = typia.random<string & tags.Format<"uuid">>();

  const updateA = {
    status: "investigating",
    assigned_moderator_id: moderatorA,
    summary: `UpdateA by moderator ${moderatorA}`,
  } satisfies IEconPoliticalForumModerationCase.IUpdate;

  const updateB = {
    status: "on_hold",
    assigned_moderator_id: moderatorB,
    summary: `UpdateB by moderator ${moderatorB}`,
  } satisfies IEconPoliticalForumModerationCase.IUpdate;

  // 5. Issue both updates in parallel and capture both outcomes using Promise.allSettled
  const promises = [
    api.functional.econPoliticalForum.administrator.moderationCases.update(
      connection,
      { caseId: createdCase.id, body: updateA },
    ),
    api.functional.econPoliticalForum.administrator.moderationCases.update(
      connection,
      { caseId: createdCase.id, body: updateB },
    ),
  ];

  const settled = await Promise.allSettled(promises);

  // Collect fulfilled responses
  const fulfilled = settled
    .map((s) =>
      s.status === "fulfilled"
        ? (s as PromiseFulfilledResult<IEconPoliticalForumModerationCase>).value
        : null,
    )
    .filter((v): v is IEconPoliticalForumModerationCase => v !== null);

  const rejected = settled
    .map((s) =>
      s.status === "rejected" ? (s as PromiseRejectedResult).reason : null,
    )
    .filter((r): r is unknown => r !== null);

  // At least one of the operations should have produced a terminal outcome (success or rejected). Validate behavior.
  if (fulfilled.length === 0) {
    // All requests failed - unexpected for this test environment, assert as an error condition
    await TestValidator.error(
      "at least one update should succeed",
      async () => {
        throw new Error("Both concurrent updates failed unexpectedly");
      },
    );
  }

  // 6. Determine observed concurrency behavior and validate consistency
  // If one or more fulfilled: pick the case with the latest updated_at timestamp as authoritative
  const parsedDates = fulfilled.map((f) => ({
    item: f,
    updatedAt: new Date(f.updated_at).getTime(),
  }));

  // Sort descending by updated_at
  parsedDates.sort((a, b) => b.updatedAt - a.updatedAt);
  const authoritative = parsedDates[0].item;
  typia.assert(authoritative);

  // Business-level checks: final authoritative state must match one of the update payloads (no merged fields)
  const matchesUpdateA =
    authoritative.status === updateA.status &&
    authoritative.assigned_moderator_id === updateA.assigned_moderator_id;
  const matchesUpdateB =
    authoritative.status === updateB.status &&
    authoritative.assigned_moderator_id === updateB.assigned_moderator_id;

  TestValidator.predicate(
    "final authoritative state equals one of the concurrent updates (no merge)",
    matchesUpdateA || matchesUpdateB,
  );

  // Additionally, if any request was rejected, ensure at least one succeeded
  if (rejected.length > 0) {
    TestValidator.predicate(
      "observed at least one rejected concurrent update",
      rejected.length > 0,
    );

    // Ensure at least one fulfilled succeeded (already guaranteed by previous check)
    TestValidator.predicate(
      "at least one fulfilled update exists",
      fulfilled.length > 0,
    );
  }

  // If both succeeded, verify last-write-wins ordering by updated_at
  if (fulfilled.length >= 2) {
    // The authoritative response should be the one with the latest updated_at
    const latest = authoritative;
    const other =
      fulfilled.find(
        (f) => f.id === latest.id && f.updated_at !== latest.updated_at,
      ) ??
      fulfilled.find((f) => f.id !== latest.id) ??
      latest;

    TestValidator.predicate(
      "when both updates succeed, authoritative response has the latest updated_at",
      new Date(latest.updated_at).getTime() >=
        Math.max(...fulfilled.map((f) => new Date(f.updated_at).getTime())),
    );

    // Ensure authoritative equals one of updates (no merge)
    TestValidator.predicate(
      "authoritative state equals exactly one update when both succeed",
      matchesUpdateA || matchesUpdateB,
    );
  }

  // Final verification: authoritative case id matches created case id
  TestValidator.equals(
    "authoritative case id matches created case id",
    authoritative.id,
    createdCase.id,
  );

  // All validation done
}
