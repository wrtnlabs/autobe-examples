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
 * Test member profile retrieval success scenario.
 *
 * This test validates the primary success path where an authenticated member
 * retrieves their own profile information. The workflow is:
 * 1. Member registers via join endpoint to establish authentication
 * 2. Member calls GET /todoApp/members/{memberId} using their own member ID
 * 3. Validate response contains complete profile information
 * 4. Verify account is in active state (deleted_at is null)
 */
export async function test_api_member_profile_retrieval_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member connection and register
  const memberConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      displayName: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies ITodoAppMember.IJoin,
  });
  typia.assert(authorized);
  // 2. Retrieve member profile using own ID
  const profile = await api.functional.todoApp.members.at(memberConnection, {
    memberId: authorized.id,
  });
  typia.assert(profile);
  // 3. Validate profile contains all required fields
  TestValidator.equals("member ID matches", profile.id, authorized.id);
  TestValidator.equals("email matches", profile.email, authorized.email);
  TestValidator.equals(
    "display name matches",
    profile.display_name,
    authorized.display_name,
  );
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
  // 4. Verify account is active (deleted_at is null)
  TestValidator.equals("account is active", profile.deleted_at, null);
}
