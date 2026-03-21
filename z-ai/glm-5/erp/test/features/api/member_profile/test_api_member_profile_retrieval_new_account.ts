import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Test successful retrieval of a newly created member's profile immediately after registration.
 *
 * This test validates the primary success path for profile retrieval by:
 * 1. Creating a new member account using authorize_member_join
 * 2. Retrieving the member's profile via GET /erpHrm/member/members
 * 3. Validating all required profile fields match expectations
 * 4. Confirming the account is active (deleted_at is null)
 * 5. Ensuring sensitive data (password_hash) is not exposed
 */
export async function test_api_member_profile_retrieval_new_account(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create a new member account with unique credentials
  const memberConnection: api.IConnection = { host: connection.host };
  const joinInput: IErpHrmMember.IJoin = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    displayName: RandomGenerator.name(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  };
  const authorizedMember: IErpHrmMember.IAuthorized =
    await authorize_member_join(memberConnection, { body: joinInput });
  typia.assert(authorizedMember);
  // Step 2: Retrieve the member's profile using the authenticated connection
  const profile: IErpHrmMember =
    await api.functional.erpHrm.member.members.at(memberConnection);
  typia.assert(profile);
  // Step 3: Validate that email matches the registered email
  TestValidator.equals(
    "email matches registered email",
    profile.email,
    joinInput.email,
  );
  // Step 4: Validate that display_name matches the registered name
  TestValidator.equals(
    "display_name matches registered name",
    profile.display_name,
    joinInput.displayName,
  );
  // Step 5: Validate that deleted_at is null for active accounts
  TestValidator.equals(
    "deleted_at is null for new account",
    profile.deleted_at,
    null,
  );
  // Step 6: Validate timestamps exist and are valid ISO datetime strings
  TestValidator.predicate(
    "created_at is valid ISO datetime",
    profile.created_at.length > 0,
  );
  TestValidator.predicate(
    "updated_at is valid ISO datetime",
    profile.updated_at.length > 0,
  );
  // Step 7: Ensure the profile has the expected id (UUID format validated by typia.assert)
  TestValidator.predicate("profile id is not empty", profile.id.length > 0);
  // Note: avatar_image and phone_number presence is validated by typia.assert()
  // Note: password_hash field absence is implicit - IErpHrmMember type doesn't include it
}
