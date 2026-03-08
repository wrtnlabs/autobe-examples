import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardGuest";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_guest_join } from "../../../authorize/authorize_guest_join";
import { authorize_guest_refresh } from "../../../authorize/authorize_guest_refresh";

export async function test_api_guest_session_metadata_tracking(
  connection: api.IConnection,
): Promise<void> {
  // Create isolated connection for guest session
  const guestConnection: api.IConnection = { host: connection.host };
  // Prepare guest join data with metadata fields
  const body: IDiscussionBoardGuest.IJoin = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "TestPassword123!",
    display_name: RandomGenerator.name(),
    href: "https://example.com/dashboard",
    referrer: "https://google.com/search",
    ip: "192.168.1.100",
  };
  // Perform guest join using utility function
  const output = await authorize_guest_join(guestConnection, { body });
  typia.assert(output);
  // Validate guest session response structure
  TestValidator.equals("has valid guest ID", typeof output.id, "string");
  TestValidator.equals(
    "has valid session token",
    typeof output.session_token,
    "string",
  );
  TestValidator.equals(
    "has valid access token",
    typeof output.access,
    "string",
  );
  TestValidator.equals(
    "has valid refresh token",
    typeof output.refresh,
    "string",
  );
  TestValidator.equals(
    "has valid expiration",
    typeof output.expired_at,
    "string",
  );
  TestValidator.notEquals("has valid token structure", output.token, null);
  // Validate metadata fields
  TestValidator.predicate(
    "guest ID is UUID format",
    /^[0-9a-f-]{36}$/i.test(output.id),
  );
  TestValidator.predicate(
    "expired_at is valid ISO 8601 datetime",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:\d{2})$/.test(
      output.expired_at,
    ),
  );
}
