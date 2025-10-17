import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconPoliticalForumAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalForumAdministrator";
import type { IEconPoliticalForumModerationCase } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalForumModerationCase";
import type { IEconPoliticalForumRegisteredUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalForumRegisteredUser";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEconPoliticalForumModerationCase } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEconPoliticalForumModerationCase";

export async function test_api_moderation_cases_list_by_admin(
  connection: api.IConnection,
) {
  // 1. Administrator registration (new admin context)
  const adminEmail: string = typia.random<string & tags.Format<"email">>();
  const admin: IEconPoliticalForumAdministrator.IAuthorized =
    await api.functional.auth.administrator.join(connection, {
      body: {
        email: adminEmail,
        password: RandomGenerator.alphaNumeric(12),
        username: RandomGenerator.alphaNumeric(8),
        display_name: RandomGenerator.name(),
      } satisfies IEconPoliticalForumAdministrator.IJoin,
    });
  // Validate admin auth response and token presence
  typia.assert(admin);

  // 2. Create moderation case(s)
  const caseNumber = `CASE-${new Date().getFullYear()}-${RandomGenerator.alphaNumeric(4).toUpperCase()}`;
  const createBody = {
    case_number: caseNumber,
    title: RandomGenerator.paragraph({ sentences: 6 }),
    status: "open",
    priority: "normal",
    summary: RandomGenerator.paragraph({ sentences: 10 }),
    legal_hold: false,
  } satisfies IEconPoliticalForumModerationCase.ICreate;

  const createdCase: IEconPoliticalForumModerationCase =
    await api.functional.econPoliticalForum.administrator.moderationCases.create(
      connection,
      {
        body: createBody,
      },
    );
  typia.assert(createdCase);

  // Basic sanity checks on created case
  TestValidator.equals(
    "created case has same case_number",
    createdCase.case_number,
    createBody.case_number,
  );
  TestValidator.equals(
    "created case priority matches",
    createdCase.priority,
    createBody.priority,
  );
  TestValidator.predicate(
    "created case status is an allowed token",
    ["open", "investigating", "closed", "on_hold"].includes(createdCase.status),
  );

  // 3. List moderation cases (page=1, limit=20)
  const pageRequest = {
    page: 1,
    limit: 20,
  } satisfies IEconPoliticalForumModerationCase.IRequest;
  const page: IPageIEconPoliticalForumModerationCase.ISummary =
    await api.functional.econPoliticalForum.administrator.moderationCases.index(
      connection,
      {
        body: pageRequest,
      },
    );
  // Validate page response structure
  typia.assert(page);

  // 4. Business assertions on listing
  TestValidator.equals(
    "pagination current equals requested page",
    page.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination limit equals requested limit",
    page.pagination.limit,
    20,
  );
  TestValidator.predicate(
    "page contains at least one moderation case",
    Array.isArray(page.data) && page.data.length > 0,
  );

  // At least one item should match the created case_number
  TestValidator.predicate(
    "created case appears in listing",
    page.data.some((d) => d.case_number === createBody.case_number),
  );

  // Note: Database-level validations and audit-log checks from the original
  // scenario are omitted because no direct DB/audit APIs were provided in the
  // material. Those checks should be performed via DB fixtures or admin
  // audit endpoints if available in the real environment.
}
