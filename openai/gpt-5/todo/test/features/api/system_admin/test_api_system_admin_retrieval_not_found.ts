import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListSystemAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListSystemAdmin";

export async function test_api_system_admin_retrieval_not_found(
  connection: api.IConnection,
) {
  /**
   * 1. Join as a system admin to obtain an authenticated session (SDK manages
   *    token).
   */
  const email: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const password: string = `${RandomGenerator.alphaNumeric(10)}_${RandomGenerator.alphaNumeric(6)}`;

  const auth = await api.functional.auth.systemAdmin.join(connection, {
    body: {
      email,
      password,
    } satisfies ITodoListSystemAdmin.ICreate,
  });
  typia.assert(auth);

  /**
   * 2. Happy path sanity check: retrieve the just-created admin to ensure access
   *    is working.
   */
  const me = await api.functional.todoList.systemAdmin.systemAdmins.at(
    connection,
    {
      systemAdminId: auth.id,
    },
  );
  typia.assert(me);
  TestValidator.equals(
    "fetched admin id equals joined admin id",
    me.id,
    auth.id,
  );
  TestValidator.equals(
    "fetched admin email equals joined admin email",
    me.email,
    auth.email,
  );

  /**
   * 3. Create a different-but-valid UUID by mutating one hex character. This
   *    preserves the UUID format but should not match any real admin id.
   */
  const mutateUuid = (u: string & tags.Format<"uuid">): string => {
    const hex = [
      "0",
      "1",
      "2",
      "3",
      "4",
      "5",
      "6",
      "7",
      "8",
      "9",
      "a",
      "b",
      "c",
      "d",
      "e",
      "f",
    ] as const;
    for (let i = u.length - 1; i >= 0; --i) {
      const ch = u[i];
      if (ch === "-") continue;
      const options = hex.filter((c) => c !== ch.toLowerCase());
      const repl = RandomGenerator.pick(options);
      return `${u.slice(0, i)}${repl}${u.slice(i + 1)}`;
    }
    // Fallback (shouldn't happen): generate a new random UUID
    return typia.random<string & tags.Format<"uuid">>();
  };
  const fakeIdString: string = mutateUuid(auth.id);
  const fakeId: string & tags.Format<"uuid"> = typia.assert<
    string & tags.Format<"uuid">
  >(fakeIdString);

  /**
   * 4. Not-found behavior validation: calling retrieval with a non-existent UUID
   *    must fail. Do not assert specific HTTP status codes; only verify an
   *    error is thrown.
   */
  await TestValidator.error(
    "retrieving a non-existent admin id should fail",
    async () => {
      await api.functional.todoList.systemAdmin.systemAdmins.at(connection, {
        systemAdminId: fakeId,
      });
    },
  );
}
