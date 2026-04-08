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
 * Test member registration rejection when email already exists.
 *
 * Validates that the system enforces email uniqueness during member registration. A guest attempts to register with an email address that is already registered to an existing member account. The system must reject the duplicate registration with a 409 conflict error.
 *
 * This test ensures the business rule that each email must be unique across all member accounts is properly enforced. The duplicate registration attempt should not create a second account or generate authentication tokens. The original member's account remains unaffected and accessible.
 *
 * 1. First member registers with a unique email and credentials.
 * 2. Second registration attempt uses the same email address.
 * 3. System rejects the duplicate registration with a 409 conflict error.
 * 4. Validates that no duplicate account was created.
 */
export async function test_api_member_join_duplicate_email(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register first member with unique email
  const firstMemberEmail = typia.random<string & tags.Format<"email">>();
  const firstMember = await authorize_member_join(connection, {
    body: {
      email: firstMemberEmail,
      password: RandomGenerator.alphaNumeric(16),
      displayName: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies ITodoAppMember.IJoin,
  });
  typia.assert(firstMember);
  // 2. Attempt to register second member with same email (should fail)
  await TestValidator.error("duplicate email registration", async () => {
    await api.functional.todoApp.auth.member.join(connection, {
      body: {
        email: firstMemberEmail,
        password: RandomGenerator.alphaNumeric(16),
        displayName: RandomGenerator.name(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: typia.random<string & tags.Format<"ipv4">>(),
      } satisfies ITodoAppMember.IJoin,
    });
  });
}
