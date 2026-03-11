import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Test duplicate email registration failure.
 * 1. Register a member with specific email address using authorize_member_join utility
 * 2. Attempt to register another member with same email but different other fields
 * 3. Verify duplicate email registration fails with appropriate error
 * 4. Validate business logic error, not type validation error
 */
export async function test_api_member_join_duplicate_email(
  connection: api.IConnection,
): Promise<void> {
  // Generate test credentials
  const duplicateEmail = typia.random<string & tags.Format<"email">>();
  const password = RandomGenerator.alphaNumeric(16);
  const displayName = RandomGenerator.name();
  const bio = RandomGenerator.paragraph({ sentences: 2 });
  const href = typia.random<string & tags.Format<"uri">>();
  const referrer = typia.random<string & tags.Format<"uri">>();
  const ip = typia.random<string & tags.Format<"ipv4">>();
  // Create first member connection and register
  const firstConn: api.IConnection = { host: connection.host };
  const firstMember = await authorize_member_join(firstConn, {
    body: {
      email: duplicateEmail,
      password,
      display_name: displayName,
      bio,
      href,
      referrer,
      ip,
    },
  });
  typia.assert(firstMember);
  TestValidator.equals(
    "email matches input",
    firstMember.email,
    duplicateEmail,
  );
  // Create second connection for duplicate registration attempt
  const secondConn: api.IConnection = { host: connection.host };
  // Different display name and bio to ensure valid request (business logic error, not type error)
  const differentDisplayName = RandomGenerator.name();
  const differentBio = RandomGenerator.paragraph({ sentences: 1 });
  // Attempt duplicate registration - should fail
  await TestValidator.error("duplicate email registration", async () => {
    await authorize_member_join(secondConn, {
      body: {
        email: duplicateEmail, // Same email - should trigger uniqueness violation
        password: RandomGenerator.alphaNumeric(16), // Different password
        display_name: differentDisplayName,
        bio: differentBio,
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: typia.random<string & tags.Format<"ipv4">>(),
      },
    });
  });
  // Validate business logic - not type validation
  // Type validation passes (all fields correct types)
  // Business logic fails because email already exists
}
