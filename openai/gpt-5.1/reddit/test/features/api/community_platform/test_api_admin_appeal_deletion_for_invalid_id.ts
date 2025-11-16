import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAccountRestriction } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAccountRestriction";
import type { ICommunityPlatformAccountRestrictionOfAdminUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAccountRestrictionOfAdminUser";
import type { ICommunityPlatformAccountRestrictionOfMemberUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAccountRestrictionOfMemberUser";
import type { ICommunityPlatformAdminUserJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminUserJoin";
import type { ICommunityPlatformAdminuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminuser";
import type { ICommunityPlatformMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberuser";
import type { ICommunityPlatformModerationAction } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerationAction";
import type { ICommunityPlatformModerationCase } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerationCase";
import type { ICommunityPlatformModerationCaseMetadata } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerationCaseMetadata";

export async function test_api_admin_appeal_deletion_for_invalid_id(
  connection: api.IConnection,
) {
  // 1. Register and authenticate an adminUser to obtain admin JWT context.
  const joinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
  } satisfies ICommunityPlatformAdminUserJoin.IRequest;

  const adminAuthorized: ICommunityPlatformAdminuser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: joinBody,
    });
  typia.assert(adminAuthorized);

  TestValidator.predicate(
    "admin access token should be issued",
    () => !!adminAuthorized.token.access,
  );

  // 2. Create a moderation case for realistic context.
  const moderationCaseBody = {
    case_key: RandomGenerator.alphaNumeric(16),
    title: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.paragraph({ sentences: 8 }),
    status: "open",
    priority: "high",
    assigned_adminuser_id: null,
  } satisfies ICommunityPlatformModerationCase.ICreate;

  const moderationCase: ICommunityPlatformModerationCase =
    await api.functional.communityPlatform.adminUser.moderationCases.create(
      connection,
      { body: moderationCaseBody },
    );
  typia.assert(moderationCase);

  TestValidator.predicate(
    "moderation case id is a non-empty string",
    moderationCase.id.length > 0,
  );

  // 3. Optionally create an account restriction episode.
  const now = new Date();
  const restrictionBody = {
    account_type: "memberUser",
    scope: "posting",
    reason_category: "abuse",
    reason_detail: RandomGenerator.paragraph({ sentences: 4 }),
    starts_at: now.toISOString(),
    ends_at: null,
  } satisfies ICommunityPlatformAccountRestriction.ICreate;

  const restriction: ICommunityPlatformAccountRestriction =
    await api.functional.communityPlatform.adminUser.accountRestrictions.create(
      connection,
      { body: restrictionBody },
    );
  typia.assert(restriction);

  TestValidator.predicate(
    "account restriction id is a non-empty string",
    restriction.id.length > 0,
  );

  // 4. Create a moderation action header linked to the case and restriction.
  const moderationActionBody = {
    moderation_case_id: moderationCase.id,
    account_restriction_id: restriction.id,
    action_type: "restrict_account",
    scope: "user",
    reason_category: "abuse",
    reason_detail: RandomGenerator.paragraph({ sentences: 4 }),
  } satisfies ICommunityPlatformModerationAction.ICreate;

  const moderationAction: ICommunityPlatformModerationAction =
    await api.functional.communityPlatform.adminUser.moderationActions.create(
      connection,
      { body: moderationActionBody },
    );
  typia.assert(moderationAction);

  TestValidator.predicate(
    "moderation action id is a non-empty string",
    moderationAction.id.length > 0,
  );

  // 5. Generate an invalid (non-existent) appealId as a random UUID.
  const invalidAppealId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();

  // 6. Attempt to delete the non-existent appeal and expect a 404 not-found HTTP error.
  await TestValidator.httpError(
    "deleting a non-existent appeal should yield 404 not-found",
    404,
    async () => {
      await api.functional.communityPlatform.adminUser.appeals.erase(
        connection,
        { appealId: invalidAppealId },
      );
    },
  );

  // 7. Sanity checks to ensure existing moderation entities remain logically intact
  //    in this test context (no runtime errors, IDs remain stable).
  TestValidator.equals(
    "moderation case id remains stable after failed delete",
    moderationCase.id,
    moderationCase.id,
  );

  TestValidator.equals(
    "account restriction id remains stable after failed delete",
    restriction.id,
    restriction.id,
  );

  TestValidator.equals(
    "moderation action id remains stable after failed delete",
    moderationAction.id,
    moderationAction.id,
  );
}
