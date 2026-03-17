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

export async function test_api_member_join_duplicate_username_conflict(
  connection: api.IConnection,
): Promise<void> {
  // Create first member connection with unique username
  const memberConnection1: api.IConnection = { host: connection.host };
  const duplicateUsername = RandomGenerator.alphaNumeric(12);
  // Step 1: First member joins successfully with specific username
  const member1 = await authorize_member_join(memberConnection1, {
    body: { username: duplicateUsername },
  });
  typia.assert(member1);
  // Step 2: Attempt second registration with same username - should fail with 409
  const memberConnection2: api.IConnection = { host: connection.host };
  await TestValidator.httpError(
    "duplicate username should return 409 conflict",
    409,
    async () => {
      await authorize_member_join(memberConnection2, {
        body: {
          username: duplicateUsername,
          email: typia.random<string & tags.Format<"email">>(),
          password: RandomGenerator.alphaNumeric(16),
        },
      });
    },
  );
}
