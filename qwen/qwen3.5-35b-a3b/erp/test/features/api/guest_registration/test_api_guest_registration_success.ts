import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmsGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsGuest";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_guest_join } from "../../../authorize/authorize_guest_join";
import { authorize_guest_refresh } from "../../../authorize/authorize_guest_refresh";

export async function test_api_guest_registration_success(
  connection: api.IConnection,
): Promise<void> {
  // Create actor-specific connection for guest registration
  const guestConnection: api.IConnection = { host: connection.host };
  // Step 1: Register guest with valid email and session context data
  const joinResult: IHrmsGuest.IAuthorized = await authorize_guest_join(
    guestConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: typia.random<string & tags.Format<"ipv4">>(),
      },
    },
  );
  // Step 2: Validate response structure
  typia.assert(joinResult);
  // Step 3: Verify guest identity information
  TestValidator.predicate("has valid guest id", joinResult.id !== "");
  TestValidator.predicate(
    "has device fingerprint",
    joinResult.device_fingerprint !== "",
  );
  TestValidator.predicate("has ip_address", joinResult.ip_address !== null);
  TestValidator.predicate("has user_agent", joinResult.user_agent !== null);
  TestValidator.predicate("has created_at", joinResult.created_at !== "");
  TestValidator.predicate("has updated_at", joinResult.updated_at !== "");
  TestValidator.predicate(
    "has deleted_at (optional)",
    joinResult.deleted_at !== undefined || joinResult.deleted_at === null,
  );
  // Step 4: Verify JWT tokens
  TestValidator.predicate("has access token", joinResult.access !== "");
  TestValidator.predicate("has refresh token", joinResult.refresh !== "");
  TestValidator.predicate("has expired_at", joinResult.expired_at !== "");
  // Step 5: Verify token structure
  typia.assert(joinResult.token);
}
