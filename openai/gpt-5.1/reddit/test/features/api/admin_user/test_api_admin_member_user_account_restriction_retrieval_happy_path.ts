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

export async function test_api_admin_member_user_account_restriction_retrieval_happy_path(
  connection: api.IConnection,
) {
  // 1. Admin bootstrap: create an authorized adminUser session via join
  const adminJoinRequest = {
    username: RandomGenerator.alphabets(12),
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
  } satisfies ICommunityPlatformAdminUserJoin.IRequest;

  const authorizedAdmin: ICommunityPlatformAdminuser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: adminJoinRequest,
    });
  typia.assert<ICommunityPlatformAdminuser.IAuthorized>(authorizedAdmin);

  // 2. Prepare target member username (assumed to exist in fixture data)
  const memberUsername: string = RandomGenerator.alphabets(10);

  // 3. Create a member-user-scoped account restriction episode
  const now = new Date();
  const startsAtRaw = now.toISOString();
  const endsAtRaw = RandomGenerator.date(
    now,
    1000 * 60 * 60 * 24 * 7,
  ).toISOString(); // within 7 days

  const restrictionCreateBody = {
    account_type: "member_user",
    scope: "posting",
    reason_category: "policy_violation",
    reason_detail: RandomGenerator.paragraph({ sentences: 4 }),
    starts_at: typia.assert<string & tags.Format<"date-time">>(startsAtRaw),
    ends_at: typia.assert<string & tags.Format<"date-time">>(endsAtRaw),
  } satisfies ICommunityPlatformAccountRestriction.ICreate;

  const createdRestriction: ICommunityPlatformAccountRestriction =
    await api.functional.communityPlatform.adminUser.memberUsers.accountRestrictions.create(
      connection,
      {
        username: memberUsername,
        body: restrictionCreateBody,
      },
    );
  typia.assert<ICommunityPlatformAccountRestriction>(createdRestriction);

  // 4. Retrieve the restriction via memberUsers.accountRestrictions.at
  const fetchedRestriction: ICommunityPlatformAccountRestriction =
    await api.functional.communityPlatform.adminUser.memberUsers.accountRestrictions.at(
      connection,
      {
        username: memberUsername,
        accountRestrictionId: createdRestriction.id,
      },
    );
  typia.assert<ICommunityPlatformAccountRestriction>(fetchedRestriction);

  // 5. Core identity and attribute consistency checks
  TestValidator.equals(
    "restriction id round-trips",
    fetchedRestriction.id,
    createdRestriction.id,
  );
  TestValidator.equals(
    "account_type is preserved",
    fetchedRestriction.account_type,
    createdRestriction.account_type,
  );
  TestValidator.equals(
    "scope is preserved",
    fetchedRestriction.scope,
    createdRestriction.scope,
  );
  TestValidator.equals(
    "reason_category is preserved",
    fetchedRestriction.reason_category,
    createdRestriction.reason_category,
  );
  TestValidator.equals(
    "starts_at is preserved",
    fetchedRestriction.starts_at,
    createdRestriction.starts_at,
  );
  TestValidator.equals(
    "ends_at is preserved",
    fetchedRestriction.ends_at ?? null,
    createdRestriction.ends_at ?? null,
  );

  // 6. Member user linkage validation when present
  if (
    fetchedRestriction.memberUserRestriction !== null &&
    fetchedRestriction.memberUserRestriction !== undefined
  ) {
    const memberLink: ICommunityPlatformAccountRestrictionOfMemberUser.ISummary =
      fetchedRestriction.memberUserRestriction;

    typia.assert<ICommunityPlatformAccountRestrictionOfMemberUser.ISummary>(
      memberLink,
    );

    TestValidator.equals(
      "memberUserRestriction links back to restriction id",
      memberLink.community_platform_account_restriction_id,
      fetchedRestriction.id,
    );

    if (memberLink.memberUser !== null && memberLink.memberUser !== undefined) {
      const memberSummary: ICommunityPlatformMemberuser.ISummary =
        memberLink.memberUser;
      typia.assert<ICommunityPlatformMemberuser.ISummary>(memberSummary);

      TestValidator.equals(
        "memberUserRestriction.memberUser.username matches path username",
        memberSummary.username,
        memberUsername,
      );
    }
  }

  // 7. Admin creator linkage validation when present
  if (
    fetchedRestriction.createdByAdminUser !== null &&
    fetchedRestriction.createdByAdminUser !== undefined
  ) {
    const creatorSummary: ICommunityPlatformAdminuser.ISummary =
      fetchedRestriction.createdByAdminUser;
    typia.assert<ICommunityPlatformAdminuser.ISummary>(creatorSummary);

    TestValidator.equals(
      "createdByAdminUser.id matches authorized admin id",
      creatorSummary.id,
      authorizedAdmin.id,
    );
  }
}
