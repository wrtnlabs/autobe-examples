import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { ITodoListGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListGuest";
import type { ITodoListToken } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListToken";
import { authorize_guest_join } from "../../../authorize/authorize_guest_join";
import { authorize_guest_refresh } from "../../../authorize/authorize_guest_refresh";
export async function test_api_guest_public_access(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create an unauthenticated connection for public access
  // This simulates an anonymous user with no authentication
  const unauthenticatedConnection: api.IConnection = { host: connection.host };
  // Step 2: Call the public access endpoint with no authentication (which is the entire point of this test)
  const publicData: ITodoListGuest.IPublic =
    await api.functional.auth.guest.index(unauthenticatedConnection);
  // Step 3: Validate the response meets the ITodoListGuest.IPublic schema (empty object)
  typia.assert(publicData);
  // Step 4: Verify the response is exactly an empty object as per schema definition
  TestValidator.equals("public data should be empty object", publicData, {});
}
