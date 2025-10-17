import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconPoliticalForumModerationCase } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalForumModerationCase";
import type { IEconPoliticalForumModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalForumModerator";

export async function test_api_moderation_case_create_by_moderator(
  connection: api.IConnection,
) {
  // 1) Register a moderator account and obtain authorization
  const moderatorEmail: string = typia.random<string & tags.Format<"email">>();
  const moderatorUsername = `mod_${RandomGenerator.alphaNumeric(8)}`;
  const moderator = await api.functional.auth.moderator.join(connection, {
    body: {
      username: moderatorUsername,
      email: moderatorEmail,
      password: "P@ssw0rd!",
      display_name: RandomGenerator.name(),
    } satisfies IEconPoliticalForumModerator.ICreate,
  });
  typia.assert(moderator);

  // 2) Prepare moderation case creation payload
  const caseNumber = `CASE-${new Date().getFullYear()}-${RandomGenerator.alphaNumeric(6)}`;
  const createBody = {
    case_number: caseNumber,
    title: RandomGenerator.paragraph({ sentences: 3 }),
    status: "open",
    priority: "normal",
    summary: RandomGenerator.paragraph({ sentences: 6 }),
    legal_hold: false,
  } satisfies IEconPoliticalForumModerationCase.ICreate;

  // 3) Create the moderation case as the authenticated moderator
  const created: IEconPoliticalForumModerationCase =
    await api.functional.econPoliticalForum.moderator.moderationCases.create(
      connection,
      {
        body: createBody,
      },
    );
  typia.assert(created);

  // 4) Business validations
  TestValidator.equals(
    "created case-number matches request",
    created.case_number,
    createBody.case_number,
  );
  TestValidator.equals(
    "created status matches request",
    created.status,
    createBody.status,
  );
  TestValidator.equals(
    "created priority matches request",
    created.priority,
    createBody.priority,
  );
  TestValidator.equals(
    "created legal_hold matches request",
    created.legal_hold,
    createBody.legal_hold,
  );

  // 5) Attempt duplicate creation to verify unique constraint enforcement
  await TestValidator.error("duplicate case_number should fail", async () => {
    await api.functional.econPoliticalForum.moderator.moderationCases.create(
      connection,
      {
        body: createBody,
      },
    );
  });

  // Note: Cleanup (soft-delete) is delegated to the test environment teardown.
}
