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
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberuser";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformAccountRestriction } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformAccountRestriction";

export async function test_api_memberuser_account_restrictions_index_requires_admin_authentication(
  connection: api.IConnection,
) {
  // 1. Register a memberUser who will be the subject of restrictions
  const memberJoinBody = {
    username: RandomGenerator.alphabets(10),
    email: `${RandomGenerator.alphabets(10)}@example.com`,
    password: RandomGenerator.alphabets(10),
    ip: null,
    href: "https://community.example.com/signup",
    referrer: "https://community.example.com/landing",
  } satisfies ICommunityPlatformMemberuser.IJoin;

  const memberAuthorized: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberJoinBody,
    });
  typia.assert(memberAuthorized);

  const memberUsername: string = memberAuthorized.username;

  // 2. Register an adminUser who will manage restrictions
  const adminJoinBody = {
    username: RandomGenerator.alphabets(10),
    email: `${RandomGenerator.alphabets(10)}@admin.example.com`,
    password: "AdminPassw0rd!" as string & tags.Format<"password">,
  } satisfies ICommunityPlatformAdminUserJoin.IRequest;

  const adminAuthorized: ICommunityPlatformAdminuser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);

  const adminId: string & tags.Format<"uuid"> = adminAuthorized.id;
  const adminIdentifier = adminAuthorized.username;

  // 3. As adminUser, create at least one generic restriction episode
  const now = new Date();
  const startsAt = now.toISOString() as string & tags.Format<"date-time">;
  const endsAt = new Date(
    now.getTime() + 60 * 60 * 1000,
  ).toISOString() as string & tags.Format<"date-time">;

  const restrictionCreateBody = {
    account_type: "memberUser",
    scope: "posting",
    reason_category: "abuse",
    reason_detail: RandomGenerator.paragraph({ sentences: 4 }),
    starts_at: startsAt,
    ends_at: endsAt,
  } satisfies ICommunityPlatformAccountRestriction.ICreate;

  const genericRestriction: ICommunityPlatformAccountRestriction =
    await api.functional.communityPlatform.adminUser.accountRestrictions.create(
      connection,
      {
        body: restrictionCreateBody,
      },
    );
  typia.assert(genericRestriction);

  // 4. Link restriction to the memberUser by username
  const linkedRestriction: ICommunityPlatformAccountRestriction =
    await api.functional.communityPlatform.adminUser.memberUsers.accountRestrictions.create(
      connection,
      {
        username: memberUsername,
        body: restrictionCreateBody,
      },
    );
  typia.assert(linkedRestriction);

  // 5. Prepare unauthenticated connection by clearing headers
  const unauthConnection: api.IConnection = {
    ...connection,
    headers: {},
  };

  // 6. Attempt to index restrictions without authentication
  const indexRequestBody = {
    page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    limit: 10 as number & tags.Type<"int32"> & tags.Minimum<1>,
    sort_by: null,
    sort_direction: null,
    subject_username: memberUsername,
    subject_type: "memberUser",
    restriction_type: null,
    is_active: null,
    effective_from_gte: null,
    effective_from_lte: null,
    effective_until_gte: null,
    effective_until_lte: null,
    reason_category: null,
    created_at_gte: null,
    created_at_lte: null,
  } satisfies ICommunityPlatformAccountRestriction.IRequest;

  await TestValidator.error(
    "index must fail without authentication",
    async () => {
      await api.functional.communityPlatform.adminUser.memberUsers.accountRestrictions.index(
        unauthConnection,
        {
          username: memberUsername,
          body: indexRequestBody,
        },
      );
    },
  );

  // 7. Authenticate as memberUser
  const memberLoginBody = {
    identifier: memberJoinBody.email,
    password: memberJoinBody.password,
    ip: null,
    href: "https://community.example.com/login",
    referrer: "https://community.example.com/home",
  } satisfies ICommunityPlatformMemberuser.ILogin;

  const memberLoginAuthorized: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.login(connection, {
      body: memberLoginBody,
    });
  typia.assert(memberLoginAuthorized);

  // 8. Attempt to index restrictions as authenticated memberUser (non-admin)
  await TestValidator.error(
    "index must fail for memberUser actor",
    async () => {
      await api.functional.communityPlatform.adminUser.memberUsers.accountRestrictions.index(
        connection,
        {
          username: memberUsername,
          body: indexRequestBody,
        },
      );
    },
  );

  // 9. Re-authenticate as adminUser
  const adminLoginBody = {
    identifier: adminIdentifier,
    password: adminJoinBody.password,
    ip: null,
    href: "https://community.example.com/admin/login",
    referrer: "https://community.example.com/admin",
  } satisfies ICommunityPlatformAdminUserLogin.IRequest;

  const adminLoginAuthorized: ICommunityPlatformAdminuser.IAuthorized =
    await api.functional.auth.adminUser.login(connection, {
      body: adminLoginBody,
    });
  typia.assert(adminLoginAuthorized);

  TestValidator.equals(
    "admin id must stay consistent across join and login",
    adminLoginAuthorized.id,
    adminId,
  );

  // 10. As adminUser, successfully index memberUser restrictions
  const pageResult: IPageICommunityPlatformAccountRestriction.ISummary =
    await api.functional.communityPlatform.adminUser.memberUsers.accountRestrictions.index(
      connection,
      {
        username: memberUsername,
        body: indexRequestBody,
      },
    );
  typia.assert(pageResult);

  TestValidator.predicate(
    "at least one restriction should be returned for the memberUser",
    pageResult.pagination.records > 0,
  );

  // Validate that all restrictions are for memberUser and created by our admin
  for (const summary of pageResult.data) {
    TestValidator.equals(
      "restriction account_type must be memberUser",
      summary.account_type,
      "memberUser",
    );

    TestValidator.equals(
      "restriction created_by_adminuser.id must match admin id",
      summary.created_by_adminuser.id,
      adminId,
    );
  }
}
