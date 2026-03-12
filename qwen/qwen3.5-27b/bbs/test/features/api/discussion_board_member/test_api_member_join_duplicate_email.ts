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
 * Test member registration rejection when attempting to register with an email that already exists.
 * 1. Register a member with a specific email address
 * 2. Attempt to register another member with the same email address
 * 3. Verify that the second registration is rejected with a 409 Conflict status code
 */
export async function test_api_member_join_duplicate_email(
  connection: api.IConnection,
): Promise<void> {
  // 1. First registration - should succeed
  const firstConnection: api.IConnection = { host: connection.host };
  const email = typia.random<string & tags.Format<"email">>();
  const firstMember = await authorize_member_join(firstConnection, {
    body: {
      email: email,
      password: typia.random<string & tags.Format<"password">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(firstMember);
  // 2. Second registration with same email - should fail with 409 Conflict
  const secondConnection: api.IConnection = { host: connection.host };
  await TestValidator.httpError(
    "duplicate email should return 409 Conflict",
    409,
    async () => {
      await authorize_member_join(secondConnection, {
        body: {
          email: email,
          password: typia.random<string & tags.Format<"password">>(),
          href: typia.random<string & tags.Format<"uri">>(),
          referrer: typia.random<string & tags.Format<"uri">>(),
        },
      });
    },
  );
  // 3. Verify first member still exists and is valid
  // Removed invalid property access - firstMember is IAuthorized type
}