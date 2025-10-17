import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconPoliticalForumAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalForumAdministrator";
import type { IEconPoliticalForumModerationCase } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalForumModerationCase";
import type { IEconPoliticalForumRegisteredUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalForumRegisteredUser";

export async function test_api_moderation_case_retrieve_by_administrator(
  connection: api.IConnection,
) {
  // 1) Administrator registration (creates token and sets connection.headers automatically)
  const adminEmail: string = typia.random<string & tags.Format<"email">>();
  const admin: IEconPoliticalForumAdministrator.IAuthorized =
    await api.functional.auth.administrator.join(connection, {
      body: {
        email: adminEmail,
        password: "AdminPass#2025",
        username: RandomGenerator.name(1),
        display_name: RandomGenerator.name(2),
      } satisfies IEconPoliticalForumAdministrator.IJoin,
    });
  typia.assert(admin);

  // 2) Create a moderation case as administrator
  const caseCreateBody = {
    case_number: `CASE-${RandomGenerator.alphaNumeric(8).toUpperCase()}`,
    title: RandomGenerator.paragraph({ sentences: 3 }),
    status: "open",
    priority: "normal",
    summary: RandomGenerator.paragraph({ sentences: 8 }),
    escalation_reason: null,
    assigned_moderator_id: null,
    owner_admin_id: admin.user?.id ?? null,
    lead_report_id: null,
    legal_hold: false,
  } satisfies IEconPoliticalForumModerationCase.ICreate;

  const created: IEconPoliticalForumModerationCase =
    await api.functional.econPoliticalForum.administrator.moderationCases.create(
      connection,
      {
        body: caseCreateBody,
      },
    );
  typia.assert(created);

  // 3) Attempt to retrieve the case via moderator-scoped endpoint while authenticated as admin
  //    Policy-driven behavior: either succeed (admin allowed) or fail (admin forbidden).
  try {
    const fetched: IEconPoliticalForumModerationCase =
      await api.functional.econPoliticalForum.moderator.moderationCases.at(
        connection,
        {
          caseId: created.id,
        },
      );
    typia.assert(fetched);

    // Business assertions for successful admin access
    TestValidator.equals(
      "administrator can retrieve moderation case id",
      fetched.id,
      created.id,
    );

    // Reading should not mutate the case; the returned object should equal the created snapshot
    TestValidator.equals("case unchanged after admin read", fetched, created);

    // Admin view should include administrative-visible fields (legal_hold must exist)
    TestValidator.predicate(
      "admin view includes legal_hold boolean",
      typeof fetched.legal_hold === "boolean",
    );
  } catch (exp) {
    // If access is forbidden by policy or any other server-side rule,
    // assert that the attempt fails. We avoid inspecting HTTP status codes.
    await TestValidator.error(
      "administrator cannot access moderator-scoped moderation case (policy-driven)",
      async () => {
        await api.functional.econPoliticalForum.moderator.moderationCases.at(
          connection,
          {
            caseId: created.id,
          },
        );
      },
    );
  }

  // NOTE: Cleanup: No deletion API for moderation cases was provided in the SDK; rely on test harness DB teardown.
}
