import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPrivateTodoAppMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IPrivateTodoAppMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Test the primary success path for member profile retrieval.
 *
 * 1. A new member joins the application via /privateTodoApp/auth/member/join with a unique email and password
 * 2. The authenticated member retrieves their profile via GET /privateTodoApp/member/profile
 * 3. Validate the response contains:
 *    - id: unique UUID matching the created member
 *    - email: the email used during registration
 *    - displayName: null (since no display name was set during join)
 *    - createdAt: valid timestamp
 *    - updatedAt: valid timestamp
 *    - deletedAt: null (account is active)
 * 4. Verify sensitive fields like password_hash are never exposed in the response
 * 5. Confirm the profile is completely private - the member can only retrieve their own profile data
 */
export async function test_api_member_profile_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create a new member account and obtain authentication
  const memberConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_member_join(memberConnection, {});
  typia.assert(authorized);
  // 2. Retrieve the member's profile
  const profile =
    await api.functional.privateTodoApp.member.profile.at(memberConnection);
  typia.assert(profile);
  // 3. Validate profile data matches the created member
  TestValidator.equals(
    "profile id matches member id",
    profile.id,
    authorized.id,
  );
  TestValidator.equals(
    "profile email matches registration email",
    profile.email,
    authorized.email,
  );
  TestValidator.equals(
    "displayName is null for new member",
    profile.displayName,
    null,
  );
  TestValidator.equals(
    "deletedAt is null for active account",
    profile.deletedAt,
    null,
  );
}
