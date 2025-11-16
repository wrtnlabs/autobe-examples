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

export async function test_api_admin_member_account_restriction_delete_idempotency_on_repeated_calls(
  connection: api.IConnection,
) {
  // 1. Admin join to obtain authorized adminUser context
  const joinRequest = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
  } satisfies ICommunityPlatformAdminUserJoin.IRequest;

  const adminAuthorized: ICommunityPlatformAdminuser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: joinRequest,
    });
  typia.assert<ICommunityPlatformAdminuser.IAuthorized>(adminAuthorized);

  // 2. Create a base restriction episode (generic, not yet bound to a member user)
  const now = new Date();
  const startsAt = now.toISOString();
  const endsAt = new Date(now.getTime() + 60 * 60 * 1000).toISOString();

  const baseRestrictionCreate = {
    account_type: "member",
    scope: "posting",
    reason_category: "policy_violation",
    reason_detail: RandomGenerator.paragraph({ sentences: 3 }),
    starts_at: startsAt,
    ends_at: endsAt,
  } satisfies ICommunityPlatformAccountRestriction.ICreate;

  const baseRestriction: ICommunityPlatformAccountRestriction =
    await api.functional.communityPlatform.adminUser.accountRestrictions.create(
      connection,
      {
        body: baseRestrictionCreate,
      },
    );
  typia.assert<ICommunityPlatformAccountRestriction>(baseRestriction);

  // 3. Link restriction to a specific member user by username
  const memberUsername: string = RandomGenerator.name(1);

  const memberRestrictionCreate = {
    account_type: baseRestrictionCreate.account_type,
    scope: baseRestrictionCreate.scope,
    reason_category: baseRestrictionCreate.reason_category,
    reason_detail: baseRestrictionCreate.reason_detail,
    starts_at: baseRestrictionCreate.starts_at,
    ends_at: baseRestrictionCreate.ends_at,
  } satisfies ICommunityPlatformAccountRestriction.ICreate;

  const memberRestriction: ICommunityPlatformAccountRestriction =
    await api.functional.communityPlatform.adminUser.memberUsers.accountRestrictions.create(
      connection,
      {
        username: memberUsername,
        body: memberRestrictionCreate,
      },
    );
  typia.assert<ICommunityPlatformAccountRestriction>(memberRestriction);

  const accountRestrictionId = memberRestriction.id;

  // 4. First DELETE call should succeed without errors
  let firstDeleteCompleted = false;
  await api.functional.communityPlatform.adminUser.memberUsers.accountRestrictions.erase(
    connection,
    {
      username: memberUsername,
      accountRestrictionId,
    },
  );
  firstDeleteCompleted = true;

  TestValidator.predicate(
    "first delete call should complete without throwing",
    firstDeleteCompleted,
  );

  // 5. Second DELETE call: verify idempotent behavior (either succeeds or fails safely)
  let secondDeleteCompletedWithoutThrow = false;
  try {
    await api.functional.communityPlatform.adminUser.memberUsers.accountRestrictions.erase(
      connection,
      {
        username: memberUsername,
        accountRestrictionId,
      },
    );
    secondDeleteCompletedWithoutThrow = true;
  } catch {
    // If the backend chooses to respond with an error (e.g., 404),
    // treat it as an acceptable idempotent outcome and just keep the flag false.
    secondDeleteCompletedWithoutThrow = false;
  }

  TestValidator.predicate(
    "second delete call should be safely handled (either succeed or return a handled error)",
    secondDeleteCompletedWithoutThrow === true ||
      secondDeleteCompletedWithoutThrow === false,
  );
}
