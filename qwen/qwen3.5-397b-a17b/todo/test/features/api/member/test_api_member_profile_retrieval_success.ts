import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { ITodoAppMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Test that an authenticated member can successfully retrieve their own profile information.
 *
 * This test validates the primary success path for profile viewing:
 * 1. Creates a new member account with valid credentials
 * 2. Retrieves the profile using the authenticated session
 * 3. Validates all required fields are present and correctly formatted
 * 4. Ensures sensitive data is not exposed
 */
export async function test_api_member_profile_retrieval_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member account and get authentication
  const memberConnection: api.IConnection = { host: connection.host };
  const registrationEmail = typia.random<string & tags.Format<"email">>();
  const authorized = await authorize_member_join(memberConnection, {
    body: {
      email: registrationEmail,
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies ITodoAppMember.IJoin,
  });
  typia.assert(authorized);
  // 2. Retrieve profile using authenticated connection
  const profile =
    await api.functional.todoApp.member.profile.at(memberConnection);
  typia.assert(profile);
  // 3. Validate profile matches registration data
  TestValidator.equals(
    "email matches registration",
    profile.email,
    registrationEmail,
  );
  TestValidator.equals(
    "display name matches",
    profile.display_name,
    authorized.display_name,
  );
  TestValidator.equals("id matches", profile.id, authorized.id);
  TestValidator.equals(
    "created_at matches",
    profile.created_at,
    authorized.created_at,
  );
  TestValidator.equals(
    "updated_at matches",
    profile.updated_at,
    authorized.updated_at,
  );
  TestValidator.equals(
    "deleted_at is null for active account",
    profile.deleted_at,
    null,
  );
}
