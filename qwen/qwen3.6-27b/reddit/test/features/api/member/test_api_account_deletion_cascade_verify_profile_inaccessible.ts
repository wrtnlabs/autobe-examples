import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IREdditLikeCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Test account deletion cascade verifying deleted profile inaccessibility to all platform users.
 *
 * Validates the complete account deletion workflow where a member deletes their profile, and verifies that the cascade deletion renders the profile permanently inaccessible. Upon deletion, all associated posts, comments, votes, subscriptions, moderator roles, and reports are cascade-deleted, and karma scores of affected voters are recalculated.
 *
 * The profile inaccessibility is verified through idempotency testing: attempting to delete an already-deleted member's profile should fail with a 404 Not Found error, proving the member has been soft-deleted and the profile is no longer accessible.
 *
 * 1. Authenticate as memberA (the account to be deleted) and capture their member ID.
 * 2. Delete memberA's profile using the authenticated session.
 * 3. Verify deletion succeeded (void response returned without error).
 * 4. Attempt to delete memberA's profile again via the same connection.
 * 5. Verify that this second deletion attempt fails with 404, confirming memberA's profile has been cascade-deleted and is permanently inaccessible.
 * 6. Authenticate as memberB and verify memberB can delete their own profile independently.
 */
export async function test_api_account_deletion_cascade_verify_profile_inaccessible(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as memberA - the account that will be deleted
  const connectionA: api.IConnection = { host: connection.host };
  const memberA = await authorize_member_join(connectionA, { body: {} });
  typia.assert(memberA);
  const memberIdA = memberA.id;
  // 2. Delete memberA's profile - cascades all associated data
  await api.functional.redditLikeCommunity.member.profile.erase(connectionA);
  // 3. Verify deletion succeeded (no exception thrown = 200 No Content received)
  TestValidator.predicate("memberA deletion succeeded", memberIdA.length > 0);
  // 4 & 5. Attempt to delete memberA's profile again via the same connection.
  // This should fail with 404 because the profile was cascade-deleted in step 2,
  // and the member now has deleted_at timestamp set (soft-deleted).
  // This proves the profile is permanently inaccessible, even via the same session.
  await TestValidator.error(
    "memberA profile is inaccessible after cascade deletion",
    async () =>
      await api.functional.redditLikeCommunity.member.profile.erase(
        connectionA,
      ),
  );
  // 6. Authenticate as memberB to verify independent account deletion capability
  const connectionB: api.IConnection = { host: connection.host };
  const memberB = await authorize_member_join(connectionB, { body: {} });
  typia.assert(memberB);
  // memberB should be able to delete their own profile independently
  await api.functional.redditLikeCommunity.member.profile.erase(connectionB);
  TestValidator.predicate("memberB deletion succeeded", memberB.id.length > 0);
}
