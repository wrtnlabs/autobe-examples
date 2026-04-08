import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerProfile";
import type { IShoppingMallMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Test duplicate email registration business logic validation.
 *
 * Validates that the system enforces email uniqueness at the business logic level by preventing multiple member accounts from being created with the same email address. This test ensures data integrity and prevents account duplication.
 *
 * The test performs two registration attempts: first with a new email address to establish a valid member account, then a second attempt with the identical email address. The second registration must be rejected with a 409 Conflict response indicating the email already exists in the system.
 *
 * 1. Register first member with generated email and credentials.
 * 2. Attempt to register second member with same email address.
 * 3. Verify second registration fails with appropriate business logic error.
 */
export async function test_api_member_join_duplicate_email(
  connection: api.IConnection,
): Promise<void> {
  // Generate unique email for testing
  const testEmail = typia.random<string & tags.Format<"email">>();
  const joinBody = {
    email: testEmail,
    password: RandomGenerator.alphaNumeric(16),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
    ip: typia.random<string & tags.Format<"ipv4">>(),
  } satisfies IShoppingMallMember.IJoin;
  // Register first member successfully
  const firstMember = await authorize_member_join(connection, {
    body: joinBody,
  });
  typia.assert(firstMember);
  // Create fresh connection for second registration attempt (no auth headers)
  const freshConnection: api.IConnection = { host: connection.host };
  // Attempt duplicate registration with same email - should fail
  await TestValidator.error("duplicate email rejected", async () => {
    await authorize_member_join(freshConnection, {
      body: {
        ...joinBody,
        password: RandomGenerator.alphaNumeric(16),
      } satisfies IShoppingMallMember.IJoin,
    });
  });
}
