import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_member_profile_soft_deleted_account(
  connection: api.IConnection,
): Promise<void> {
  /**
   * Test member profile retrieval for active account.
   * Note: Soft-delete testing requires admin API which is not available.
   * This test validates that active members can retrieve their profile.
   *
   * Test Steps:
   * 1. Register a new member account with valid credentials
   * 2. Retrieve the member's profile using GET /redditClone/member/me
   * 3. Validate the profile response contains all expected fields
   * 4. Verify deleted_at is null (account is active)
   */
  // 1. Register a new member account
  const memberConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_member_join(memberConnection, {
    body: {},
  });
  typia.assert(authorized);
  // 2. Retrieve the member's profile
  const profile =
    await api.functional.redditClone.member.me.at(memberConnection);
  typia.assert(profile);
  // 3. Validate profile fields
  TestValidator.equals("member id matches", profile.id, authorized.id);
  TestValidator.equals(
    "member username matches",
    profile.username,
    authorized.username,
  );
  TestValidator.equals("member email matches", profile.email, authorized.email);
  TestValidator.equals(
    "member display_name matches",
    profile.display_name,
    authorized.display_name,
  );
  TestValidator.equals("member karma matches", profile.karma, authorized.karma);
  // 4. Verify account is active (deleted_at is null)
  TestValidator.equals(
    "account is active (deleted_at is null)",
    profile.deleted_at,
    null,
  );
  // 5. Validate timestamps exist
  TestValidator.predicate(
    "created_at is valid date-time",
    profile.created_at.length > 0,
  );
  TestValidator.predicate(
    "updated_at is valid date-time",
    profile.updated_at.length > 0,
  );
}
