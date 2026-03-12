import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministrator";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

/**
 * Test handling of requests to retrieve non-existent administrator profiles.
 *
 * This test validates that the system properly returns a 404 Not Found error
 * when attempting to retrieve an administrator that does not exist in the
 * system, ensuring appropriate error handling without exposing sensitive data.
 */
export async function test_api_administrator_not_found_handling(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate as an administrator
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardAdministrator.IJoin,
  });
  // 2. Generate a random non-existent administrator ID
  const nonExistentId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // 3. Attempt to retrieve non-existent administrator and validate 404 error
  await TestValidator.httpError(
    "should return 404 for non-existent administrator",
    404,
    async () =>
      await api.functional.discussionBoard.administrators.at(adminConnection, {
        administratorId: nonExistentId,
      }),
  );
}
