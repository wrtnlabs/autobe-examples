import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMultiUserTodoMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoMember";
import type { IMultiUserTodoUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoUserProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Test that the authenticated member can retrieve their own profile successfully.
 *
 * This test validates the privacy isolation of the member profile endpoint by:
 * 1. Registering a new member account with unique credentials
 * 2. Retrieving the profile using the authenticated session
 * 3. Verifying the response contains valid profile metadata
 * 4. Confirming the profile ID matches the authenticated member ID
 *
 * The endpoint inherently enforces privacy by only returning the profile linked
 * to the current session's member ID - there is no capability to access other
 * users' profiles through this endpoint.
 */
export async function test_api_member_profile_privacy_isolation(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register member account using utility function
  const memberConnection: api.IConnection = { host: connection.host };
  const auth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(auth);
  // 2. Retrieve profile using authenticated connection
  const profile =
    await api.functional.multiUserTodo.member.profile.at(memberConnection);
  typia.assert(profile);
  // 3. Validate profile data integrity
  TestValidator.equals(
    "profile id matches authenticated member id",
    profile.id,
    auth.id,
  );
  TestValidator.predicate(
    "display name is non-empty string",
    profile.displayName.length > 0,
  );
  TestValidator.predicate(
    "created at is valid date string",
    profile.createdAt.length > 0,
  );
  TestValidator.predicate(
    "updated at is valid date string",
    profile.updatedAt.length > 0,
  );
  TestValidator.equals(
    "deleted at is null for active profile",
    profile.deletedAt,
    null,
  );
}
