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

export async function test_api_admin_user_account_restriction_creation_business_rule_validation(
  connection: api.IConnection,
) {
  // 1. Join as admin A to obtain an authenticated adminUser context
  const adminAJoinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
  } satisfies ICommunityPlatformAdminUserJoin.IRequest;

  const adminA: ICommunityPlatformAdminuser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: adminAJoinBody,
    });
  typia.assert<ICommunityPlatformAdminuser.IAuthorized>(adminA);

  // 2. Join as admin B (target of restrictions)
  const adminBJoinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
  } satisfies ICommunityPlatformAdminUserJoin.IRequest;

  const adminB: ICommunityPlatformAdminuser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: adminBJoinBody,
    });
  typia.assert<ICommunityPlatformAdminuser.IAuthorized>(adminB);

  // 3. Re-join as admin A so that subsequent calls act as admin A
  const adminA2: ICommunityPlatformAdminuser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: {
        username: adminAJoinBody.username,
        email: adminAJoinBody.email,
        password: adminAJoinBody.password,
      } satisfies ICommunityPlatformAdminUserJoin.IRequest,
    });
  typia.assert<ICommunityPlatformAdminuser.IAuthorized>(adminA2);

  // 4. Create a valid restriction R1 for admin B
  const now = new Date();
  const startsAtR1: string & tags.Format<"date-time"> = new Date(
    now.getTime() + 60 * 60 * 1000,
  ).toISOString() as string & tags.Format<"date-time">; // +1 hour
  const endsAtR1: string & tags.Format<"date-time"> = new Date(
    now.getTime() + 2 * 60 * 60 * 1000,
  ).toISOString() as string & tags.Format<"date-time">; // +2 hours

  const restrictionCreateBodyR1 = {
    account_type: "adminUser",
    scope: "login",
    reason_category: "abuse",
    reason_detail: RandomGenerator.paragraph({ sentences: 5 }),
    starts_at: startsAtR1,
    ends_at: endsAtR1,
  } satisfies ICommunityPlatformAccountRestriction.ICreate;

  const r1: ICommunityPlatformAccountRestriction =
    await api.functional.communityPlatform.adminUser.adminUsers.accountRestrictions.create(
      connection,
      {
        username: adminB.username,
        body: restrictionCreateBodyR1,
      },
    );
  typia.assert<ICommunityPlatformAccountRestriction>(r1);

  // Validate R1 mirrors key creation attributes
  TestValidator.equals(
    "R1 account_type must match request",
    r1.account_type,
    restrictionCreateBodyR1.account_type,
  );
  TestValidator.equals(
    "R1 scope must match request",
    r1.scope,
    restrictionCreateBodyR1.scope,
  );
  TestValidator.equals(
    "R1 reason_category must match request",
    r1.reason_category,
    restrictionCreateBodyR1.reason_category,
  );
  TestValidator.equals(
    "R1 reason_detail must match request",
    r1.reason_detail ?? null,
    restrictionCreateBodyR1.reason_detail ?? null,
  );

  // Temporal window coherence: ends_at should be after starts_at when both exist
  await TestValidator.predicate(
    "R1 ends_at is later than starts_at",
    async () => {
      const r1Start = new Date(r1.starts_at).getTime();
      const r1End =
        r1.ends_at !== null && r1.ends_at !== undefined
          ? new Date(r1.ends_at).getTime()
          : null;
      return r1End === null ? false : r1End > r1Start;
    },
  );

  // 5. Attempt to create a second restriction R2 with invalid temporal window
  const startsAtR2: string & tags.Format<"date-time"> = new Date(
    now.getTime() + 2 * 60 * 60 * 1000,
  ).toISOString() as string & tags.Format<"date-time">; // +2 hours
  const endsAtR2: string & tags.Format<"date-time"> = new Date(
    now.getTime() + 60 * 60 * 1000,
  ).toISOString() as string & tags.Format<"date-time">; // +1 hour (earlier than start)

  const restrictionCreateBodyR2 = {
    account_type: "adminUser",
    scope: "login",
    reason_category: "abuse",
    reason_detail: RandomGenerator.paragraph({ sentences: 3 }),
    starts_at: startsAtR2,
    ends_at: endsAtR2,
  } satisfies ICommunityPlatformAccountRestriction.ICreate;

  await TestValidator.error(
    "Creating R2 with ends_at earlier than starts_at must fail by business rule",
    async () => {
      await api.functional.communityPlatform.adminUser.adminUsers.accountRestrictions.create(
        connection,
        {
          username: adminB.username,
          body: restrictionCreateBodyR2,
        },
      );
    },
  );

  // 6. We cannot list restrictions with given SDK; rely on R2 failure to assert
  // that only R1 is persisted in the system, while ensuring R1 itself is valid.
}
