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

export async function test_api_admin_appeal_update_requires_admin_authentication(
  connection: api.IConnection,
) {
  // 1. Register an adminUser account and keep credentials for later login
  const adminJoinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: "AdminPassw0rd!",
  } satisfies ICommunityPlatformAdminUserJoin.IRequest;

  const adminAuthorized: ICommunityPlatformAdminuser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);

  // Preserve admin login identifier
  const adminIdentifier: string = adminJoinBody.email;
  const adminPassword: string = adminJoinBody.password;

  // 2. Register a memberUser account and keep credentials for later login
  const memberJoinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: "MemberPassw0rd!",
    ip: null,
    href: "https://client.example.com/join",
    referrer: "https://client.example.com/landing",
  } satisfies ICommunityPlatformMemberuser.IJoin;

  const memberAuthorized: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberJoinBody,
    });
  typia.assert(memberAuthorized);

  const memberIdentifier: string = memberJoinBody.email;
  const memberPassword: string = memberJoinBody.password;

  // 3. Ensure we are authenticated as adminUser to set up moderation artifacts
  const adminLoginBody = {
    identifier: adminIdentifier,
    password: adminPassword,
    ip: null,
    href: "https://admin.example.com/login",
    referrer: "https://admin.example.com/landing",
  } satisfies ICommunityPlatformAdminUserLogin.IRequest;

  const adminLoginResult: ICommunityPlatformAdminuser.IAuthorized =
    await api.functional.auth.adminUser.login(connection, {
      body: adminLoginBody,
    });
  typia.assert(adminLoginResult);

  // 4. Create a moderation case as adminUser
  const moderationCaseBody = {
    case_key: `case-${RandomGenerator.alphaNumeric(8)}`,
    title: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.paragraph({ sentences: 6 }),
    status: "open",
    priority: "high",
    assigned_adminuser_id: null,
  } satisfies ICommunityPlatformModerationCase.ICreate;

  const moderationCase: ICommunityPlatformModerationCase =
    await api.functional.communityPlatform.adminUser.moderationCases.create(
      connection,
      {
        body: moderationCaseBody,
      },
    );
  typia.assert(moderationCase);

  // 5. Optionally create an account restriction; keep it simple but valid
  const nowIso: string = new Date().toISOString();
  const restrictionEndsAt: string = new Date(
    Date.now() + 24 * 60 * 60 * 1000,
  ).toISOString();

  const accountRestrictionBody = {
    account_type: "memberUser",
    scope: "posting",
    reason_category: "policy_violation",
    reason_detail: RandomGenerator.paragraph({ sentences: 4 }),
    starts_at: nowIso,
    ends_at: restrictionEndsAt,
  } satisfies ICommunityPlatformAccountRestriction.ICreate;

  const accountRestriction: ICommunityPlatformAccountRestriction =
    await api.functional.communityPlatform.adminUser.accountRestrictions.create(
      connection,
      {
        body: accountRestrictionBody,
      },
    );
  typia.assert(accountRestriction);

  // 6. Create a moderation action linked to the moderation case and restriction
  const moderationActionBody = {
    moderation_case_id: moderationCase.id,
    account_restriction_id: accountRestriction.id,
    action_type: "restrict_account",
    scope: "user",
    reason_category: "policy_violation",
    reason_detail: RandomGenerator.paragraph({ sentences: 5 }),
  } satisfies ICommunityPlatformModerationAction.ICreate;

  const moderationAction: ICommunityPlatformModerationAction =
    await api.functional.communityPlatform.adminUser.moderationActions.create(
      connection,
      {
        body: moderationActionBody,
      },
    );
  typia.assert(moderationAction);

  // 7. Switch to memberUser and create an appeal for the moderation action
  const memberLoginBody = {
    identifier: memberIdentifier,
    password: memberPassword,
    ip: null,
    href: "https://client.example.com/login",
    referrer: "https://client.example.com/home",
  } satisfies ICommunityPlatformMemberuser.ILogin;

  const memberLoginResult: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.login(connection, {
      body: memberLoginBody,
    });
  typia.assert(memberLoginResult);

  const appealCreateBody = {
    moderation_action_id: moderationAction.id,
    justification: RandomGenerator.paragraph({ sentences: 6 }),
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

  // 8. Prepare a common admin update payload for the appeal
  const adminUpdateBody = {
    status: "approved",
    decision_reason: RandomGenerator.paragraph({ sentences: 4 }),
    resolved_at: new Date().toISOString(),
  } satisfies ICommunityPlatformAppeal.IUpdate;

  // 9. Anonymous request: build a connection without Authorization header
  const anonymousConnection: api.IConnection = {
    ...connection,
    headers: {},
  };

  await TestValidator.error(
    "anonymous admin appeal update must fail",
    async () => {
      await api.functional.communityPlatform.adminUser.appeals.update(
        anonymousConnection,
        {
          appealId,
          body: adminUpdateBody,
        },
      );
    },
  );

  // 10. MemberUser-authenticated request must also fail on admin path
  const memberReLoginBody = {
    identifier: memberIdentifier,
    password: memberPassword,
    ip: null,
    href: "https://client.example.com/login",
    referrer: "https://client.example.com/home",
  } satisfies ICommunityPlatformMemberuser.ILogin;

  const memberReLoginResult: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.login(connection, {
      body: memberReLoginBody,
    });
  typia.assert(memberReLoginResult);

  await TestValidator.error(
    "memberUser attempting admin appeal update must fail",
    async () => {
      await api.functional.communityPlatform.adminUser.appeals.update(
        connection,
        {
          appealId,
          body: adminUpdateBody,
        },
      );
    },
  );

  // 11. AdminUser-authenticated request must succeed and apply updates
  const adminReLoginBody = {
    identifier: adminIdentifier,
    password: adminPassword,
    ip: null,
    href: "https://admin.example.com/login",
    referrer: "https://admin.example.com/dashboard",
  } satisfies ICommunityPlatformAdminUserLogin.IRequest;

  const adminReLoginResult: ICommunityPlatformAdminuser.IAuthorized =
    await api.functional.auth.adminUser.login(connection, {
      body: adminReLoginBody,
    });
  typia.assert(adminReLoginResult);

  const updatedAppeal: ICommunityPlatformAppeal =
    await api.functional.communityPlatform.adminUser.appeals.update(
      connection,
      {
        appealId,
        body: adminUpdateBody,
      },
    );
  typia.assert(updatedAppeal);

  TestValidator.equals(
    "admin update should change appeal status",
    updatedAppeal.status,
    adminUpdateBody.status,
  );

  TestValidator.equals(
    "admin update should change decision_reason",
    updatedAppeal.decision_reason,
    adminUpdateBody.decision_reason,
  );

  TestValidator.equals(
    "admin update should set resolved_at",
    updatedAppeal.resolved_at,
    adminUpdateBody.resolved_at,
  );
}
