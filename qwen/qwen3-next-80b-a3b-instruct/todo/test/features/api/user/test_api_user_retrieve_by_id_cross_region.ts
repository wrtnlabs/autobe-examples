import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";

export async function test_api_user_retrieve_by_id_cross_region(
  connection: api.IConnection,
) {
  const testEmail: string = typia.random<string & tags.Format<"email">>();
  const joinResponse: ITodoListUser.IAuthorized =
    await api.functional.auth.user.join(connection, {
      body: {
        email: testEmail,
        password: RandomGenerator.paragraph({
          sentences: 1,
          wordMin: 12,
          wordMax: 20,
        }),
      } satisfies ITodoListUser.ICreate,
    });
  typia.assert(joinResponse);

  const retrieveResponse: ITodoListUser =
    await api.functional.todoList.user.actors.at(connection, {
      userId: joinResponse.id,
    });
  typia.assert(retrieveResponse);
  TestValidator.equals(
    "retrieved email matches created email",
    retrieveResponse,
    testEmail,
  );
}
