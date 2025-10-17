import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformKarmaLedger } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformKarmaLedger";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";

/**
 * Validate retrieval of a member's (or community) karma ledger by authenticated
 * user.
 *
 * Test workflow:
 *
 * 1. Register a new member via join (member must be authenticated for feature
 *    access)
 * 2. Member creates a new community (required for community-scoped ledgers)
 * 3. Admin registers and authenticates
 * 4. Admin creates a karma ledger for the member, scoped to the new community with
 *    test values
 * 5. Member fetches the karma ledger by its ID
 * 6. Core data (current_karma, member/community association, feature lock reason)
 *    is validated
 * 7. Attempting retrieval by unauthenticated user should fail (authorization
 *    enforced)
 *
 * This workflow ensures end-to-end business rules for permissions and field
 * correctness.
 */
export async function test_api_karma_ledger_retrieval_by_member(
  connection: api.IConnection,
) {
  // 1. Register a test member (Reddit user)
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = RandomGenerator.alphaNumeric(12);
  const authorizedMember = await api.functional.auth.member.join(connection, {
    body: {
      email: memberEmail,
      password: memberPassword,
    } satisfies ICommunityPlatformMember.ICreate,
  });
  typia.assert(authorizedMember);
  const memberId = authorizedMember.id;

  // 2. Member creates a community (subreddit)
  const communityReq = {
    name: RandomGenerator.alphaNumeric(10),
    title: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.paragraph({ sentences: 5 }),
    slug: RandomGenerator.alphaNumeric(10),
  } satisfies ICommunityPlatformCommunity.ICreate;
  const createdCommunity =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: communityReq,
      },
    );
  typia.assert(createdCommunity);

  const communityId = createdCommunity.id;

  // 3. Register as admin
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphaNumeric(14);
  const authorizedAdmin = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
    } satisfies ICommunityPlatformAdmin.ICreate,
  });
  typia.assert(authorizedAdmin);

  // 4. As admin, create a karma ledger for the test member scoped to the new community
  //    Use recognizable values for later validation
  const initialKarma = 42; // test value
  const lockReason = "Test feature lock reason";
  const createdLedger =
    await api.functional.communityPlatform.admin.karmaLedgers.create(
      connection,
      {
        body: {
          community_platform_member_id: memberId,
          community_platform_community_id: communityId,
          current_karma: initialKarma,
          feature_lock_reason: lockReason,
        } satisfies ICommunityPlatformKarmaLedger.ICreate,
      },
    );
  typia.assert(createdLedger);
  const ledgerId = createdLedger.id;
  TestValidator.equals(
    "ledger karma matches",
    createdLedger.current_karma,
    initialKarma,
  );
  TestValidator.equals(
    "ledger member matches",
    createdLedger.community_platform_member_id,
    memberId,
  );
  TestValidator.equals(
    "ledger community matches",
    createdLedger.community_platform_community_id,
    communityId,
  );
  TestValidator.equals(
    "ledger lock reason matches",
    createdLedger.feature_lock_reason,
    lockReason,
  );

  // 5. As member, retrieve the ledger by ID and verify fields
  // (member connection already authenticated after join)
  const fetchedLedger =
    await api.functional.communityPlatform.member.karmaLedgers.at(connection, {
      karmaLedgerId: ledgerId,
    });
  typia.assert(fetchedLedger);
  TestValidator.equals("ledger id matches", fetchedLedger.id, ledgerId);
  TestValidator.equals(
    "ledger current_karma matches",
    fetchedLedger.current_karma,
    initialKarma,
  );
  TestValidator.equals(
    "ledger feature lock matches",
    fetchedLedger.feature_lock_reason,
    lockReason,
  );
  TestValidator.equals(
    "ledger member id matches",
    fetchedLedger.community_platform_member_id,
    memberId,
  );
  TestValidator.equals(
    "ledger community id matches",
    fetchedLedger.community_platform_community_id,
    communityId,
  );

  // 6. Try unauthenticated retrieval (simulate by clearing token)
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "unauthenticated should not get karma ledger",
    async () => {
      await api.functional.communityPlatform.member.karmaLedgers.at(
        unauthConn,
        {
          karmaLedgerId: ledgerId,
        },
      );
    },
  );
}
