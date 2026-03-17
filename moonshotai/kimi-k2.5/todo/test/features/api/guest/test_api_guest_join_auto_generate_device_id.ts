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

/**
 * Test guest identity creation with auto-generated device_id.
 *
 * This test validates that when device_id is omitted from the join request,
 * the server automatically generates a UUIDv4 device_id. Only href and referrer
 * are provided as required fields, with device_id intentionally absent to
 * trigger the auto-generation feature. The response must contain a valid
 * IMultiUserTodoGuest.IAuthorized structure with complete token credentials.
 */
export async function test_api_guest_join_auto_generate_device_id(
  connection: api.IConnection,
): Promise<void> {
  // Create a fresh connection for this test
  const guestConnection: api.IConnection = { host: connection.host };
  // Join with only required fields, omitting device_id to trigger auto-generation
  // ip is set to null as allowed by the type definition
  const result = await authorize_guest_join(guestConnection, {
    body: {
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: null,
    },
  });
  // Validate the complete authorization response structure
  typia.assert(result);
}
