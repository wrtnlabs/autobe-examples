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

export async function test_api_admin_member_user_account_restriction_retrieval_invalid_id(
  connection: api.IConnection,
) {
  // 1. Register an adminUser to obtain authorized context
  const adminJoinBody = {
    username: `admin_${RandomGenerator.alphabets(8)}`,
    email: typia.random<string & tags.Format<"email">>(),
    // Generate a password string; satisfies will ensure it conforms to the DTO
    password: RandomGenerator.alphaNumeric(16),
  } satisfies ICommunityPlatformAdminUserJoin.IRequest;

  const adminAuthorized: ICommunityPlatformAdminuser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: adminJoinBody,
    });
  typia.assert<ICommunityPlatformAdminuser.IAuthorized>(adminAuthorized);

  // 2. Create a restriction for member user A via memberUsers.accountRestrictions.create
  const memberUsernameA = `member_a_${RandomGenerator.alphabets(8)}`;

  const now = new Date();
  const startsAt = now.toISOString();
  const endsAt = new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString();

  const restrictionCreateBodyA = {
    account_type: "memberUser",
    scope: "posting",
    reason_category: "abuse",
    reason_detail: RandomGenerator.paragraph({ sentences: 5 }),
    starts_at: startsAt,
    ends_at: endsAt,
  } satisfies ICommunityPlatformAccountRestriction.ICreate;

  const restrictionA: ICommunityPlatformAccountRestriction =
    await api.functional.communityPlatform.adminUser.memberUsers.accountRestrictions.create(
      connection,
      {
        username: memberUsernameA,
        body: restrictionCreateBodyA,
      },
    );
  typia.assert<ICommunityPlatformAccountRestriction>(restrictionA);

  // 3. Attempt cross-account retrieval using a different username B
  const memberUsernameB = `member_b_${RandomGenerator.alphabets(8)}`;

  await TestValidator.error(
    "cross-account restriction retrieval must fail",
    async () => {
      await api.functional.communityPlatform.adminUser.memberUsers.accountRestrictions.at(
        connection,
        {
          username: memberUsernameB,
          accountRestrictionId: restrictionA.id,
        },
      );
    },
  );

  // 4. Sanity check: restriction is retrievable for the correct username A
  const restrictionAForUserA: ICommunityPlatformAccountRestriction =
    await api.functional.communityPlatform.adminUser.memberUsers.accountRestrictions.at(
      connection,
      {
        username: memberUsernameA,
        accountRestrictionId: restrictionA.id,
      },
    );
  typia.assert<ICommunityPlatformAccountRestriction>(restrictionAForUserA);

  TestValidator.equals(
    "restriction id must match when fetched for correct member user",
    restrictionAForUserA.id,
    restrictionA.id,
  );

  // 5. Attempt retrieval with a non-existent restriction ID for a valid username
  const nonExistentRestrictionId = typia.random<string & tags.Format<"uuid">>();

  await TestValidator.error(
    "retrieval with non-existent restriction id must fail",
    async () => {
      await api.functional.communityPlatform.adminUser.memberUsers.accountRestrictions.at(
        connection,
        {
          username: memberUsernameA,
          accountRestrictionId: nonExistentRestrictionId,
        },
      );
    },
  );
}
