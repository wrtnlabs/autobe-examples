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
 * Test that requesting a non-existent member profile returns HTTP 404.
 *
 * Creates an authenticated member account via the join endpoint, then attempts to retrieve a member profile using a random UUID that does not exist in the database. Validates that the API returns a 404 Not Found error, confirming proper handling of missing primary key lookups.
 *
 * 1. Create a member account with valid credentials to establish an authenticated session.
 * 2. Call the member detail endpoint with a randomly generated non-existent UUID.
 * 3. Verify that an HTTP 404 error is thrown.
 */
export async function test_api_member_profile_not_found(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member with authenticated context
  const memberConnection: api.IConnection = { host: connection.host };
  const output = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "password123!",
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies ITodoAppMember.IJoin,
  });
  typia.assert(output);
  // 2-3. Query with non-existent UUID and expect 404
  const nonExistentId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  await TestValidator.httpError(
    "non-existent member returns 404",
    404,
    async () => {
      await api.functional.todoApp.members.at(memberConnection, {
        memberId: nonExistentId,
      });
    },
  );
}
