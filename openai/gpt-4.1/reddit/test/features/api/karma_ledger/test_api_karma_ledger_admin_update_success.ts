import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformKarmaLedger } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformKarmaLedger";

/**
 * Test successful update of a karma ledger's current karma by an admin.
 *
 * Workflow:
 *
 * 1. Register as a new admin (receiving admin credentials and token)
 * 2. Create a new community (as if a member had already joined and become creator)
 * 3. Create a mock member UUID (simulate member registration)
 * 4. Create a karma ledger for the new member-community pair via admin endpoint
 * 5. Update the karma ledger's current_karma using the admin update endpoint
 * 6. Assert that the response reflects the updated karma and correct
 *    member/community reference
 * 7. Optionally: attempt unauthorized update (with non-admin credentials or
 *    unauthenticated) to check that update is blocked (error raised)
 */
export async function test_api_karma_ledger_admin_update_success(
  connection: api.IConnection,
) {
  // 1. Create a new admin for authentication
  const adminCreateBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    superuser: RandomGenerator.pick([true, false]),
  } satisfies ICommunityPlatformAdmin.ICreate;

  const admin: ICommunityPlatformAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, { body: adminCreateBody });
  typia.assert(admin);
  TestValidator.predicate(
    "admin received token after join",
    !!admin.token.access,
  );

  // 2. Create a new community (simulate as member creator, use random creator_member_id)
  const creatorMemberId = typia.random<string & tags.Format<"uuid">>();
  const communityCreateBody = {
    name: RandomGenerator.name(1),
    title: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.paragraph({ sentences: 6 }),
    slug: RandomGenerator.alphaNumeric(12),
  } satisfies ICommunityPlatformCommunity.ICreate;

  const community: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      { body: communityCreateBody },
    );
  typia.assert(community);

  // 3. Prepare member UUID
  const memberId = typia.random<string & tags.Format<"uuid">>();

  // 4. Create a karma ledger for the member-community pair as admin
  const initKarma = typia.random<number & tags.Type<"int32">>();
  const createLedgerBody = {
    community_platform_member_id: memberId,
    community_platform_community_id: community.id,
    current_karma: initKarma,
    feature_lock_reason: null,
  } satisfies ICommunityPlatformKarmaLedger.ICreate;

  const karmaLedger: ICommunityPlatformKarmaLedger =
    await api.functional.communityPlatform.admin.karmaLedgers.create(
      connection,
      { body: createLedgerBody },
    );
  typia.assert(karmaLedger);
  TestValidator.equals(
    "karma ledger references member id",
    karmaLedger.community_platform_member_id,
    memberId,
  );
  TestValidator.equals(
    "karma ledger references community id",
    karmaLedger.community_platform_community_id,
    community.id,
  );
  TestValidator.equals(
    "karma ledger has initial karma",
    karmaLedger.current_karma,
    initKarma,
  );

  // 5. Update the current_karma value
  const updatedKarma = initKarma + 42;
  const updateLedgerBody = {
    current_karma: updatedKarma,
    feature_lock_reason: "Manual adjustment for test",
  } satisfies ICommunityPlatformKarmaLedger.IUpdate;

  const updatedLedger: ICommunityPlatformKarmaLedger =
    await api.functional.communityPlatform.admin.karmaLedgers.update(
      connection,
      {
        karmaLedgerId: karmaLedger.id,
        body: updateLedgerBody,
      },
    );
  typia.assert(updatedLedger);
  TestValidator.equals(
    "ledger id stays the same after update",
    updatedLedger.id,
    karmaLedger.id,
  );
  TestValidator.equals(
    "ledger current_karma updated",
    updatedLedger.current_karma,
    updatedKarma,
  );
  TestValidator.equals(
    "ledger feature_lock_reason updated",
    updatedLedger.feature_lock_reason,
    "Manual adjustment for test",
  );
  TestValidator.equals(
    "member id remains correct",
    updatedLedger.community_platform_member_id,
    memberId,
  );
  TestValidator.equals(
    "community id remains correct",
    updatedLedger.community_platform_community_id,
    community.id,
  );
  TestValidator.predicate(
    "updated_at has changed after update",
    updatedLedger.updated_at !== karmaLedger.updated_at,
  );
  TestValidator.equals(
    "created_at stays the same after update",
    updatedLedger.created_at,
    karmaLedger.created_at,
  );
}
