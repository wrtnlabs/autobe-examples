import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMultiUserTodoGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoGuest";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_guest_join } from "../../../authorize/authorize_guest_join";
import { authorize_guest_refresh } from "../../../authorize/authorize_guest_refresh";

export async function test_api_guest_retrieval_soft_deleted(
  connection: api.IConnection,
): Promise<void> {
  // Create a guest account
  const guestConnection: api.IConnection = { host: connection.host };
  const guest = await authorize_guest_join(guestConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IMultiUserTodoGuest.IJoin,
  });
  typia.assert(guest);
  // Test that retrieving a non-existent guest fails
  await TestValidator.error(
    "retrieving non-existent guest should fail",
    async () => {
      await api.functional.multiUserTodo.guests.at(guestConnection, {
        guestId: typia.random<string & tags.Format<"uuid">>(),
      });
    },
  );
  // Since there's no API to soft-delete guests, we cannot test the soft-delete scenario
  // The test focuses on validating the error handling for non-existent guests
}
