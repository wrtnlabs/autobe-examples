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

export async function test_api_guest_session_join(
  connection: api.IConnection,
): Promise<void> {
  // 1. Prepare test data for guest join
  const body = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    display_name: RandomGenerator.name(),
    href: "https://example.com/discussion",
    referrer: "https://example.com/home",
    ip: "192.168.1.100" satisfies string & tags.Format<"ipv4">,
  } satisfies IDiscussionBoardGuest.IJoin;
  // 2. Create guest session using utility function
  const output = await authorize_guest_join(connection, { body });
  // 3. Validate response structure
  typia.assert(output);
  // 4. Verify required fields exist and are non-empty
  TestValidator.notEquals("has valid UUID", output.id, null);
  TestValidator.notEquals("has session token", output.session_token, "");
  TestValidator.notEquals("has access token", output.access, "");
  TestValidator.notEquals("has refresh token", output.refresh, "");
  TestValidator.predicate(
    "has valid expiration",
    new Date(output.expired_at) > new Date(),
  );
}
