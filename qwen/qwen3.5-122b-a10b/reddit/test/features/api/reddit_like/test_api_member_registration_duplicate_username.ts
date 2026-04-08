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
 * Test member registration rejection when attempting to register with a duplicate username.
 *
 * Validates that the system enforces username uniqueness constraint during member registration. When a user attempts to create a new account using a username that is already registered by another member, the system must reject the registration request with an appropriate error response. This ensures each member has a distinct public identifier across the platform.
 *
 * 1. Register first member account with unique credentials.
 * 2. Attempt to register second member account with same username.
 * 3. Validates that registration fails with appropriate error.
 */
export async function test_api_member_registration_duplicate_username(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register first member account
  const firstConnection: api.IConnection = { host: connection.host };
  const firstMember = await authorize_member_join(firstConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(1),
      href: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditLikeMember.IJoin,
  });
  typia.assert(firstMember);
  // 2. Attempt to register second member with same username (should fail)
  const secondConnection: api.IConnection = { host: connection.host };
  await TestValidator.error("duplicate username rejected", async () => {
    await authorize_member_join(secondConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        username: firstMember.username, // Same username as first member
        href: typia.random<string & tags.Format<"uri">>(),
      } satisfies IRedditLikeMember.IJoin,
    });
  });
}
