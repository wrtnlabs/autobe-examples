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
 * Test successful member registration with valid email and password credentials.
 *
 * Validates the complete member registration flow including account creation, authentication token generation, and immediate session establishment. Ensures that the new member account is properly created with all required fields and that the member is immediately authenticated without requiring additional login.
 *
 * Special attention is given to verifying that the registration response contains all required authentication tokens and that the member account is in an active state ready for todo operations.
 *
 * 1. Create isolated member connection for registration.
 * 2. Call authorize_member_join with valid email, password, href, referrer, and optional display_name.
 * 3. Validate response contains ITodoAppMember.IAuthorized with all required fields.
 * 4. Verify email matches the input email address.
 * 5. Verify account is active (deleted_at is null).
 * 6. Verify token contains access, refresh, expired_at, and refreshable_until fields.
 */
export async function test_api_member_registration_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create isolated member connection for registration
  const memberConnection: api.IConnection = { host: connection.host };
  // 2. Prepare registration input with valid credentials
  const inputEmail = typia.random<string & tags.Format<"email">>();
  const inputDisplayName = RandomGenerator.name();
  // 3. Register new member with valid credentials
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: inputEmail,
      password: RandomGenerator.alphaNumeric(16),
      display_name: inputDisplayName,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(member);
  // 4. Validate business logic
  TestValidator.equals("email matches input", member.email, inputEmail);
  TestValidator.equals(
    "display_name matches input",
    member.display_name,
    inputDisplayName,
  );
  TestValidator.equals("account is active", member.deleted_at, null);
  TestValidator.predicate(
    "token has access field",
    member.token.access.length > 0,
  );
  TestValidator.predicate(
    "token has refresh field",
    member.token.refresh.length > 0,
  );
  TestValidator.predicate(
    "token has expired_at",
    member.token.expired_at.length > 0,
  );
  TestValidator.predicate(
    "token has refreshable_until",
    member.token.refreshable_until.length > 0,
  );
}
