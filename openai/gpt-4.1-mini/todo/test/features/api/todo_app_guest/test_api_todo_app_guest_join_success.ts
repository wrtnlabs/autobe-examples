import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { ITodoAppAccessToken } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppAccessToken";
import type { ITodoAppGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppGuest";
import { authorize_guest_join } from "../../../authorize/authorize_guest_join";
import { authorize_guest_refresh } from "../../../authorize/authorize_guest_refresh";
export async function test_api_todo_app_guest_join_success(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create an isolated guest connection
  const guestConnection: api.IConnection = { host: connection.host };
  // Step 2: Prepare valid join request body according to ITodoAppGuest.IJoin
  const joinBody = {
    email: `${RandomGenerator.alphaNumeric(8)}@example.com`,
    ip: null, // optional IP address, set explicitly to null
    href: `https://${RandomGenerator.alphabets(8)}.com`,
    referrer: `https://${RandomGenerator.alphabets(8)}.com`,
  } satisfies ITodoAppGuest.IJoin;
  // Step 3: Perform guest join operation using authorize_guest_join utility function
  const authorizedGuest: ITodoAppGuest.IAuthorized = await authorize_guest_join(
    guestConnection,
    { body: joinBody },
  );
  // Step 4: Assert the response is valid and matches ITodoAppGuest.IAuthorized
  typia.assert(authorizedGuest);
  // Step 5: Additional asserts on properties to verify correct formats
  TestValidator.predicate(
    "guest id is uuid format",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      authorizedGuest.id,
    ),
  );
  TestValidator.predicate(
    "token.access is string and non-empty",
    typeof authorizedGuest.token.access === "string" &&
      authorizedGuest.token.access.length > 0,
  );
  TestValidator.predicate(
    "token.refresh is string and non-empty",
    typeof authorizedGuest.token.refresh === "string" &&
      authorizedGuest.token.refresh.length > 0,
  );
  TestValidator.predicate(
    "token.expired_at is ISO8601 date-time",
    /^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}.[0-9]{3}Z$/.test(
      authorizedGuest.token.expired_at,
    ),
  );
  TestValidator.predicate(
    "token.refreshable_until is ISO8601 date-time",
    /^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}.[0-9]{3}Z$/.test(
      authorizedGuest.token.refreshable_until,
    ),
  );
}
