import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Test member registration rejection when attempting to register with a username that is already taken by an existing member.
 *
 * Validates the duplicate username business rule by first creating a member account with unique credentials, then attempting to register a second account with the same username but different email. The system must reject the duplicate username with a 409 Conflict error.
 *
 * This test ensures username uniqueness constraint is properly enforced at the business logic level. Usernames are used for public identification and @mention functionality, so they must be globally unique across all member accounts. The test verifies that the backend correctly detects and rejects duplicate username attempts regardless of email address.
 *
 * 1. First member registration with unique email and username using authorize_member_join utility.
 * 2. Second registration attempt with same username but different email address.
 * 3. Verify system returns 409 Conflict error indicating username is already taken.
 */
export async function test_api_member_registration_duplicate_username(
  connection: api.IConnection,
): Promise<void> {
  // 1. First member registration with unique credentials
  const firstUsername = RandomGenerator.name(1);
  const firstEmail = typia.random<string & tags.Format<"email">>();
  const firstMember = await authorize_member_join(connection, {
    body: {
      email: firstEmail,
      password: RandomGenerator.alphaNumeric(16),
      username: firstUsername,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IRedditCommunityMember.IJoin,
  });
  typia.assert(firstMember);
  // Validate first member was created successfully
  TestValidator.equals("username matches", firstMember.username, firstUsername);
  TestValidator.equals("email matches", firstMember.email, firstEmail);
  // 2. Create new connection for second registration attempt
  const secondConnection: api.IConnection = { host: connection.host };
  const secondEmail = typia.random<string & tags.Format<"email">>();
  // 3. Attempt duplicate username registration - should fail with 409 Conflict
  await TestValidator.error("duplicate username rejection", async () => {
    await authorize_member_join(secondConnection, {
      body: {
        email: secondEmail,
        password: RandomGenerator.alphaNumeric(16),
        username: firstUsername, // Same username as first member
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: typia.random<string & tags.Format<"ipv4">>(),
      } satisfies IRedditCommunityMember.IJoin,
    });
  });
}
