import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdministrator";
import type { ICommunityPlatformKarmaHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformKarmaHistory";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformKarmaHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformKarmaHistory";

/**
 * Test authorization enforcement for administrator karma history endpoint.
 *
 * Validates that only authenticated administrators can access the karma history
 * endpoint, and that unauthenticated requests or non-administrator users are
 * properly rejected. Tests role-based access control for system-wide karma
 * audit trails.
 *
 * Process:
 *
 * 1. Create a member account for testing unauthorized access
 * 2. Create an administrator account for authenticated access
 * 3. Test that unauthenticated requests are rejected with 401
 * 4. Test that member accounts cannot access the endpoint
 * 5. Test that authenticated administrators can successfully access karma history
 * 6. Validate the response structure contains proper karma history data
 */
export async function test_api_karma_history_administrator_unauthorized_access(
  connection: api.IConnection,
) {
  // Step 1: Create a test member account
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberData = {
    email: memberEmail,
    username: RandomGenerator.alphabets(8),
    password: RandomGenerator.alphaNumeric(12),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies ICommunityPlatformMember.ICreate;

  const memberAccount = await api.functional.auth.member.join(connection, {
    body: memberData,
  });
  typia.assert(memberAccount);

  // Step 2: Create a test administrator account
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminUsername = RandomGenerator.alphabets(8);
  const adminData = {
    email: adminEmail,
    username: adminUsername,
    password: RandomGenerator.alphaNumeric(12),
    name: RandomGenerator.name(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies ICommunityPlatformAdministrator.ICreate;

  const adminAccount = await api.functional.auth.administrator.join(
    connection,
    {
      body: adminData,
    },
  );
  typia.assert(adminAccount);

  // Step 3: Test unauthenticated access is rejected with 401
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  const targetMemberId = memberAccount.id;

  await TestValidator.error(
    "unauthenticated request should be rejected",
    async () => {
      await api.functional.communityPlatform.administrator.members.karmaHistory.at(
        unauthConn,
        {
          memberId: targetMemberId,
        },
      );
    },
  );

  // Step 4: Test that member account cannot access administrator endpoint
  const memberConn: api.IConnection = { ...connection, headers: {} };
  memberConn.headers = {
    Authorization: memberAccount.token.access,
  };

  await TestValidator.error(
    "member account should not access administrator endpoint",
    async () => {
      await api.functional.communityPlatform.administrator.members.karmaHistory.at(
        memberConn,
        {
          memberId: targetMemberId,
        },
      );
    },
  );

  // Step 5: Test that authenticated administrator can access karma history
  const adminConn: api.IConnection = { ...connection, headers: {} };
  adminConn.headers = {
    Authorization: adminAccount.token.access,
  };

  const karmaHistory: IPageICommunityPlatformKarmaHistory =
    await api.functional.communityPlatform.administrator.members.karmaHistory.at(
      adminConn,
      {
        memberId: targetMemberId,
      },
    );
  typia.assert(karmaHistory);

  // Step 6: Validate response structure
  TestValidator.predicate(
    "karma history response has pagination",
    karmaHistory.pagination !== undefined,
  );
  TestValidator.predicate(
    "pagination has current page",
    karmaHistory.pagination.current >= 0,
  );
  TestValidator.predicate(
    "pagination has limit",
    karmaHistory.pagination.limit >= 0,
  );
  TestValidator.predicate(
    "pagination has records count",
    karmaHistory.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination has pages count",
    karmaHistory.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "karma history data is array",
    Array.isArray(karmaHistory.data),
  );
}
