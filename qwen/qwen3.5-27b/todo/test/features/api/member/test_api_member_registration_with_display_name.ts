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
 * Test member registration with optional display name field to verify profile customization during account creation.
 *
 * Validates the member registration flow with display name customization. Ensures that the display name is correctly stored in the member profile and appears in the authentication response. Verifies that the account is created with proper authentication tokens and that the account status is active.
 *
 * Special attention is given to verifying that the display_name field is properly handled as an optional field, and that the authentication response includes all necessary fields for subsequent API calls.
 *
 * 1. Create a new member connection for isolation from the base connection.
 * 2. Register a new member with email, password, display_name, href, and referrer fields.
 * 3. Validate the authentication response contains all expected fields including display_name.
 * 4. Verify the account is active (deleted_at is null) and tokens are properly structured.
 */
export async function test_api_member_registration_with_display_name(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member connection for isolation
  const memberConnection: api.IConnection = { host: connection.host };
  // 2. Register member with display name
  const displayName = RandomGenerator.name();
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: displayName,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(member);
  // 3. Validate response fields
  TestValidator.equals(
    "display_name matches input",
    member.display_name,
    displayName,
  );
  TestValidator.predicate(
    "display_name is not null",
    member.display_name !== null,
  );
  TestValidator.predicate(
    "display_name has content",
    member.display_name!.length > 0,
  );
  TestValidator.equals("account is active", member.deleted_at, null);
  TestValidator.predicate(
    "has valid id format",
    /^[0-9a-f-]{36}$/i.test(member.id),
  );
  TestValidator.predicate(
    "created_at is valid datetime",
    member.created_at.length > 0,
  );
  TestValidator.predicate(
    "updated_at is valid datetime",
    member.updated_at.length > 0,
  );
  TestValidator.predicate("has access token", member.token.access.length > 0);
  TestValidator.predicate("has refresh token", member.token.refresh.length > 0);
  TestValidator.predicate("has expired_at", member.token.expired_at.length > 0);
  TestValidator.predicate(
    "has refreshable_until",
    member.token.refreshable_until.length > 0,
  );
}
