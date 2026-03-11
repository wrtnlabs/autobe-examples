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

export async function test_api_guest_retrieval_valid_active(
  connection: api.IConnection,
): Promise<void> {
  // Create a guest account to get a valid guest ID
  const guestConnection: api.IConnection = { host: connection.host };
  const guestJoin = await authorize_guest_join(guestConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IMultiUserTodoGuest.IJoin,
  });
  typia.assert(guestJoin);
  // Retrieve the guest details using the guest ID
  const retrievedGuest = await api.functional.multiUserTodo.guests.at(
    guestConnection,
    {
      guestId: guestJoin.id,
    },
  );
  typia.assert(retrievedGuest);
  // Validate the response structure matches expectations
  TestValidator.equals("guest ID matches", retrievedGuest.id, guestJoin.id);
  TestValidator.equals("email matches", retrievedGuest.email, guestJoin.email);
  TestValidator.equals(
    "deleted_at should be null for active account",
    retrievedGuest.deleted_at,
    null,
  );
}
