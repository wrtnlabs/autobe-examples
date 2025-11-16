import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAccountRestriction } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAccountRestriction";
import type { ICommunityPlatformAccountRestrictionOfAdminUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAccountRestrictionOfAdminUser";
import type { ICommunityPlatformAccountRestrictionOfMemberUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAccountRestrictionOfMemberUser";
import type { ICommunityPlatformAdminUserJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminUserJoin";
import type { ICommunityPlatformAdminUserLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminUserLogin";
import type { ICommunityPlatformAdminuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminuser";
import type { ICommunityPlatformAppeal } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAppeal";
import type { ICommunityPlatformMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberuser";
import type { ICommunityPlatformModerationAction } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerationAction";
import type { ICommunityPlatformModerationCase } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerationCase";
import type { ICommunityPlatformModerationCaseMetadata } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerationCaseMetadata";

export async function test_api_admin_appeal_resolution_to_approved(
  connection: api.IConnection,
) {
  // 1. Admin user joins
  const adminEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const adminPassword: string & tags.Format<"password"> =
    "Adm1nPass!" as string & tags.Format<"password">;

  const adminJoinBody = {
    username: RandomGenerator.name(1),
    email: adminEmail,
    password: adminPassword,
  } satisfies ICommunityPlatformAdminUserJoin.IRequest;

  const adminAuthorized: ICommunityPlatformAdminuser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);

  // 2. Member user joins
  const memberEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const memberPassword: string = "MemberPass!";

  const memberJoinBody = {
    username: RandomGenerator.name(1) as string &
      tags.MinLength<3> &
      tags.MaxLength<32>,
    email: memberEmail,
    password: ("MemberPass!" + RandomGenerator.alphabets(2)) as string &
      tags.MinLength<8>,
    ip: null,
    href: "https://community.example.com/join" as string & tags.Format<"uri">,
    referrer: "https://community.example.com" as string & tags.Format<"uri">,
  } satisfies ICommunityPlatformMemberuser.IJoin;

  const memberAuthorized: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberJoinBody,
    });
  typia.assert(memberAuthorized);

  // 3. Switch back to admin (login) to perform admin-only actions
  const adminLoginBody = {
    identifier: adminEmail,
    password: adminPassword,
    ip: null,
    href: "https://community.example.com/admin/login" as string &
      tags.Format<"uri">,
    referrer: "https://community.example.com" as string & tags.Format<"uri">,
  } satisfies ICommunityPlatformAdminUserLogin.IRequest;

  const adminLoggedIn: ICommunityPlatformAdminuser.IAuthorized =
    await api.functional.auth.adminUser.login(connection, {
      body: adminLoginBody,
    });
  typia.assert(adminLoggedIn);

  // 4. Create a moderation case
  const moderationCaseBody = {
    case_key: `case-${RandomGenerator.alphaNumeric(8)}`,
    title: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.paragraph({ sentences: 6 }),
    status: "open",
    priority: "high",
    assigned_adminuser_id: adminLoggedIn.id,
  } satisfies ICommunityPlatformModerationCase.ICreate;

  const moderationCase: ICommunityPlatformModerationCase =
    await api.functional.communityPlatform.adminUser.moderationCases.create(
      connection,
      {
        body: moderationCaseBody,
      },
    );
  typia.assert(moderationCase);

  // 5. Optionally create an account restriction for the member user
  const now = new Date();
  const startsAt = now.toISOString() as string & tags.Format<"date-time">;
  const endsAt = new Date(
    now.getTime() + 7 * 24 * 60 * 60 * 1000,
  ).toISOString() as string & tags.Format<"date-time">;

  const restrictionBody = {
    account_type: "memberUser",
    scope: "posting",
    reason_category: "abuse",
    reason_detail: RandomGenerator.paragraph({ sentences: 5 }),
    starts_at: startsAt,
    ends_at: endsAt,
  } satisfies ICommunityPlatformAccountRestriction.ICreate;

  const accountRestriction: ICommunityPlatformAccountRestriction =
    await api.functional.communityPlatform.adminUser.accountRestrictions.create(
      connection,
      {
        body: restrictionBody,
      },
    );
  typia.assert(accountRestriction);

  // 6. Create a moderation action referencing the moderation case and restriction
  const moderationActionBody = {
    moderation_case_id: moderationCase.id,
    account_restriction_id: accountRestriction.id,
    action_type: "restrict_account",
    scope: "user",
    reason_category: "abuse",
    reason_detail: RandomGenerator.paragraph({ sentences: 4 }),
  } satisfies ICommunityPlatformModerationAction.ICreate;

  const moderationAction: ICommunityPlatformModerationAction =
    await api.functional.communityPlatform.adminUser.moderationActions.create(
      connection,
      {
        body: moderationActionBody,
      },
    );
  typia.assert(moderationAction);

  // 7. Switch authentication context to member user and create an appeal
  const memberLoginBody = {
    identifier: memberEmail,
    password: memberJoinBody.password,
    ip: null,
    href: "https://community.example.com/login" as string & tags.Format<"uri">,
    referrer: "https://community.example.com" as string & tags.Format<"uri">,
  } satisfies ICommunityPlatformMemberuser.ILogin;

  const memberLoggedIn: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.login(connection, {
      body: memberLoginBody,
    });
  typia.assert(memberLoggedIn);

  const appealCreateBody = {
    moderation_action_id: moderationAction.id,
    justification: RandomGenerator.paragraph({ sentences: 8 }),
  } satisfies ICommunityPlatformAppeal.ICreate;

  const createdAppeal: ICommunityPlatformAppeal =
    await api.functional.communityPlatform.memberUser.appeals.create(
      connection,
      {
        body: appealCreateBody,
      },
    );
  typia.assert(createdAppeal);

  // Validate initial appeal linkage and basic state
  TestValidator.equals(
    "appeal moderation_action linkage",
    createdAppeal.moderation_action.id,
    moderationAction.id,
  );
  TestValidator.equals(
    "appeal appellant linkage",
    createdAppeal.appellant_member_user.id,
    memberLoggedIn.id,
  );
  TestValidator.predicate(
    "initial appeal status must be non-empty",
    createdAppeal.status.length > 0,
  );

  // 8. Switch back to admin to resolve the appeal
  const adminReloginBody = {
    identifier: adminEmail,
    password: adminPassword,
    ip: null,
    href: "https://community.example.com/admin/login" as string &
      tags.Format<"uri">,
    referrer: "https://community.example.com" as string & tags.Format<"uri">,
  } satisfies ICommunityPlatformAdminUserLogin.IRequest;

  const adminReloggedIn: ICommunityPlatformAdminuser.IAuthorized =
    await api.functional.auth.adminUser.login(connection, {
      body: adminReloginBody,
    });
  typia.assert(adminReloggedIn);

  // 9. Admin resolves the appeal as approved
  const resolutionTimestamp = new Date().toISOString() as string &
    tags.Format<"date-time">;
  const decisionReason = RandomGenerator.paragraph({ sentences: 5 });
  const approvalStatus = "approved";

  const appealUpdateBody = {
    status: approvalStatus,
    decision_reason: decisionReason,
    resolved_at: resolutionTimestamp,
  } satisfies ICommunityPlatformAppeal.IUpdate;

  const updatedAppeal: ICommunityPlatformAppeal =
    await api.functional.communityPlatform.adminUser.appeals.update(
      connection,
      {
        appealId: createdAppeal.id,
        body: appealUpdateBody,
      },
    );
  typia.assert(updatedAppeal);

  // 10. Validate updated state
  TestValidator.equals(
    "appeal id must be stable across update",
    updatedAppeal.id,
    createdAppeal.id,
  );
  TestValidator.equals(
    "appeal status must be updated to approved",
    updatedAppeal.status,
    approvalStatus,
  );
  TestValidator.equals(
    "appeal decision_reason must match submitted value",
    updatedAppeal.decision_reason ?? "",
    decisionReason,
  );
  TestValidator.equals(
    "appeal resolved_at must match submitted value",
    updatedAppeal.resolved_at ?? "",
    resolutionTimestamp,
  );
  TestValidator.equals(
    "moderation_action linkage preserved after update",
    updatedAppeal.moderation_action.id,
    moderationAction.id,
  );
  TestValidator.equals(
    "appellant linkage preserved after update",
    updatedAppeal.appellant_member_user.id,
    memberAuthorized.id,
  );

  // Basic monotonicity check on updated_at vs created_at
  TestValidator.predicate(
    "updated_at must not be earlier than created_at",
    updatedAppeal.updated_at >= updatedAppeal.created_at,
  );
}
