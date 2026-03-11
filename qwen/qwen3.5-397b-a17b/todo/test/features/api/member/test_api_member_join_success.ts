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
 * Test successful member registration with valid credentials.
 *
 * This test validates the primary success path of the member registration workflow:
 * 1. Submit registration request with unique email, secure password, and display name
 * 2. Verify the system creates a new member account with the provided information
 * 3. Validate response includes member ID, email, display name, timestamps
 * 4. Confirm deleted_at is null (active account)
 * 5. Verify JWT authentication tokens are provided (access, refresh, expired_at, refreshable_until)
 * 6. Confirm the account is immediately usable for member operations
 */
export async function test_api_member_join_success(
  connection: api.IConnection,
): Promise<void> {
  // Create member connection and perform join using utility function
  const memberConnection: api.IConnection = { host: connection.host };
  const joinInput = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    displayName: RandomGenerator.name(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
    ip: typia.random<string & tags.Format<"ipv4">>(),
  } satisfies ITodoAppMember.IJoin;
  const authorized = await authorize_member_join(memberConnection, {
    body: joinInput,
  });
  typia.assert(authorized);
  // Validate member information matches input
  TestValidator.equals(
    "email matches input",
    authorized.email,
    joinInput.email,
  );
  TestValidator.equals(
    "display name matches input",
    authorized.display_name,
    joinInput.displayName,
  );
  // Validate account is active (not soft deleted)
  TestValidator.equals(
    "deleted_at is null (active account)",
    authorized.deleted_at,
    null,
  );
  // Validate member connection has token set for subsequent operations
  TestValidator.predicate(
    "member connection has authorization header",
    memberConnection.headers?.Authorization !== undefined,
  );
}
