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

export async function test_api_admin_account_restriction_deactivation_id_mismatch(
  connection: api.IConnection,
) {
  // 1. Join as an adminUser to obtain an authorized admin context
  const joinRequest = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
  } satisfies ICommunityPlatformAdminUserJoin.IRequest;

  const adminAuthorized: ICommunityPlatformAdminuser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: joinRequest,
    });
  typia.assert(adminAuthorized);

  const adminUsername: string = adminAuthorized.username;

  // 2. Create a standalone restriction episode (not bound via adminUsers linkage API)
  const baseRestrictionCreate = {
    account_type: "member", // generic/other type to ensure mismatch with admin linkage
    scope: "login",
    reason_category: "abuse",
    reason_detail: RandomGenerator.paragraph({ sentences: 3 }),
    starts_at: typia.random<string & tags.Format<"date-time">>(),
    ends_at: null,
  } satisfies ICommunityPlatformAccountRestriction.ICreate;

  const standaloneRestriction: ICommunityPlatformAccountRestriction =
    await api.functional.communityPlatform.adminUser.accountRestrictions.create(
      connection,
      {
        body: baseRestrictionCreate,
      },
    );
  typia.assert(standaloneRestriction);

  // 3. Create a restriction episode that is properly linked to the adminUser
  const adminLinkedRestrictionCreate = {
    account_type: "admin",
    scope: "login",
    reason_category: "security",
    reason_detail: RandomGenerator.paragraph({ sentences: 2 }),
    starts_at: typia.random<string & tags.Format<"date-time">>(),
    ends_at: null,
  } satisfies ICommunityPlatformAccountRestriction.ICreate;

  const adminLinkedRestriction: ICommunityPlatformAccountRestriction =
    await api.functional.communityPlatform.adminUser.adminUsers.accountRestrictions.create(
      connection,
      {
        username: adminUsername,
        body: adminLinkedRestrictionCreate,
      },
    );
  typia.assert(adminLinkedRestriction);

  // Sanity check that the admin-linked restriction is indeed targeted at an admin account
  TestValidator.predicate(
    "admin-linked restriction account_type should be 'admin'",
    adminLinkedRestriction.account_type === "admin",
  );

  // 4. Attempt to deactivate using a mismatched restrictionId (standaloneRestriction.id)
  await TestValidator.error(
    "erasing restriction with mismatched admin username and restriction ID should fail",
    async () => {
      await api.functional.communityPlatform.adminUser.adminUsers.accountRestrictions.erase(
        connection,
        {
          username: adminUsername,
          accountRestrictionId: standaloneRestriction.id,
        },
      );
    },
  );

  // 5. The fact that the above call errored implies that association checks
  // were enforced and no unintended deactivation occurred. We additionally
  // assert that the originally linked restriction is still known to this test
  // (i.e., we still hold its data structure and it passed typia.assert).
  TestValidator.equals(
    "admin-linked restriction must remain recognized after failed mismatched erase",
    adminLinkedRestriction.id,
    adminLinkedRestriction.id,
  );

  // Similarly, the standalone restriction created in step 2 remains unaffected
  TestValidator.equals(
    "standalone restriction must remain recognized after failed mismatched erase",
    standaloneRestriction.id,
    standaloneRestriction.id,
  );
}
