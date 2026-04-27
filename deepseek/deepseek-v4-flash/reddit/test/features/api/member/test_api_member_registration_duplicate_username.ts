import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformProfile";
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
 * Test that registering a member with a duplicate username is rejected with a 409 Conflict error.
 *
 * Validates the server-side unique constraint on the username field. First, a member is registered with a specific username using the join endpoint. Then, a second registration attempt with the same username but a different email is expected to fail with HTTP 409, indicating the username field as the source of the conflict.
 *
 * 1. Register the first member with email "user1@test.com" and username "taken_name".
 * 2. Verify the first member's registration succeeds via typia.assert validation.
 * 3. Attempt to register a second member with email "user2@test.com" and the same username "taken_name".
 * 4. Verify the second attempt returns HTTP 409 Conflict.
 */
export async function test_api_member_registration_duplicate_username(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register first member with the target username
  const member1Connection: api.IConnection = { host: connection.host };
  const firstMember = await authorize_member_join(member1Connection, {
    body: {
      email: "user1@test.com",
      username: "taken_name",
    },
  });
  typia.assert(firstMember);
  // 2. Attempt to register a second member with the same username and verify 409 Conflict
  await TestValidator.httpError("duplicate username", 409, async () => {
    await authorize_member_join(
      { host: connection.host },
      {
        body: {
          email: "user2@test.com",
          username: "taken_name",
        },
      },
    );
  });
}
