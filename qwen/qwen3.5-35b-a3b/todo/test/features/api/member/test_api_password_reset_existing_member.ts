import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { ITodoAppMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMember";
import type { ITodoAppMemberPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMemberPasswordReset";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_todo_app_member_password_resets_request_reset } from "../../../generate/generate_random_todo_app_member_password_resets_request_reset";
import { prepare_random_todo_app_member_password_reset } from "../../../prepare/prepare_random_todo_app_member_password_reset";

/**
 * Test password reset token generation for an existing member.
 *
 * This test validates the primary business workflow where a member initiates
 * the password recovery process by providing their registered email address.
 * The system generates a secure token with proper expiration and returns
 * identical responses for valid and invalid emails (security requirement).
 *
 * @param connection - Base E2E test connection
 */
export async function test_api_password_reset_existing_member(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member account for authentication
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      displayName: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies ITodoAppMember.IJoin,
  });
  typia.assert(member);
  // 2. Request password reset for the created member
  const resetConnection: api.IConnection = { host: connection.host };
  const resetResponse =
    await generate_random_todo_app_member_password_resets_request_reset(
      resetConnection,
      {
        body: {
          email: member.email,
        } satisfies ITodoAppMemberPasswordReset.ICreate,
      },
    );
  typia.assert(resetResponse);
  // 3. Validate response structure
  TestValidator.equals("response has id", typeof resetResponse.id, "string");
  TestValidator.equals(
    "response has created_at",
    typeof resetResponse.created_at,
    "string",
  );
  // 4. Validate ID format (UUID)
  const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  TestValidator.equals(
    "id is valid UUID",
    uuidRegex.test(resetResponse.id),
    true,
  );
  // 5. Validate created_at format (ISO 8601 datetime)
  const datetimeRegex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;
  TestValidator.equals(
    "created_at is valid ISO datetime",
    datetimeRegex.test(resetResponse.created_at),
    true,
  );
  // 6. Verify response structure is identical for fake email (security requirement)
  const fakeEmail = typia.random<string & tags.Format<"email">>();
  const fakeResetResponse =
    await generate_random_todo_app_member_password_resets_request_reset(
      resetConnection,
      {
        body: {
          email: fakeEmail,
        } satisfies ITodoAppMemberPasswordReset.ICreate,
      },
    );
  typia.assert(fakeResetResponse);
  TestValidator.equals(
    "response structure identical for fake email",
    typeof fakeResetResponse.id,
    typeof resetResponse.id,
  );
  TestValidator.equals(
    "response created_at exists for fake email",
    typeof fakeResetResponse.created_at,
    typeof resetResponse.created_at,
  );
  TestValidator.equals(
    "fake email ID is valid UUID",
    uuidRegex.test(fakeResetResponse.id),
    true,
  );
  TestValidator.equals(
    "fake email created_at is valid ISO datetime",
    datetimeRegex.test(fakeResetResponse.created_at),
    true,
  );
}
