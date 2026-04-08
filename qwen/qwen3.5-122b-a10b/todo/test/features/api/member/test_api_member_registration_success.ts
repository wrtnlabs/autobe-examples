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

export async function test_api_member_registration_success(
  connection: api.IConnection,
): Promise<void> {
  /**
   * Test successful member account registration with complete information.
   *
   * Validates the complete member registration workflow including credential validation, account creation, and immediate authentication. Ensures that the system properly creates a new member record with hashed password, generates authorization tokens, and returns all required member identity information.
   *
   * Special attention is given to verifying that the display name is set correctly (either provided or defaulted to email prefix), that timestamps are properly generated, and that the returned authorization tokens are valid for subsequent authenticated requests.
   *
   * 1. Generate unique registration credentials with valid email format.
   * 2. Call member join endpoint with complete registration data.
   * 3. Validates response contains all required member fields.
   * 4. Verifies authorization token structure and expiration timestamps.
   * 5. Confirms deleted_at is null for active account.
   */
  const memberConnection: api.IConnection = { host: connection.host };
  const email = typia.random<string & tags.Format<"email">>();
  const displayName = RandomGenerator.name();
  const registration = await authorize_member_join(memberConnection, {
    body: {
      email,
      password: RandomGenerator.alphaNumeric(16),
      display_name: displayName,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies ITodoAppMember.IJoin,
  });
  typia.assert(registration);
  TestValidator.equals("email matches input", registration.email, email);
  TestValidator.equals(
    "display name matches input",
    registration.display_name,
    displayName,
  );
  TestValidator.equals(
    "deleted_at is null for active account",
    registration.deleted_at,
    null,
  );
  TestValidator.predicate(
    "access token has content",
    registration.token.access.length > 0,
  );
  TestValidator.predicate(
    "refresh token has content",
    registration.token.refresh.length > 0,
  );
}
