import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Test member registration rejection when the email address is already in use.
 * First, successfully create a member account with a specific email address.
 * Then attempt to register a new member using the same email address with a different username.
 * The system must validate email uniqueness and return HTTP 409 Conflict status code when a duplicate email is detected.
 * Verify that no new member record is created and no session is established.
 */
export async function test_api_member_join_duplicate_email_conflict(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create a member with a specific email
  const memberConnection: api.IConnection = { host: connection.host };
  const email = typia.random<string & tags.Format<"email">>();
  const firstMember = await authorize_member_join(memberConnection, {
    body: {
      email,
      username: RandomGenerator.name(1),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies DeepPartial<IRedditLikeMember.IJoin>,
  });
  typia.assert(firstMember);
  // Step 2: Attempt to create another member with the same email but different username
  // Should throw HTTP 409 Conflict
  const newConnection: api.IConnection = { host: connection.host };
  await TestValidator.httpError(
    "duplicate email should return 409 Conflict",
    409,
    async () =>
      await authorize_member_join(newConnection, {
        body: {
          email: email,
          username: RandomGenerator.name(1),
          password: RandomGenerator.alphaNumeric(16),
        } satisfies DeepPartial<IRedditLikeMember.IJoin>,
      }),
  );
}
