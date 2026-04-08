import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmMember";
import type { IHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmOrganization";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Test timer discard endpoint returns 409 Conflict when no active timer exists.
 *
 * Validates that attempting to discard a timer when no active timer exists for the employee returns a 409 Conflict HTTP error. This ensures proper business rule enforcement that discard operations are only valid when an active timer exists.
 *
 * The test authenticates as a member without starting any timer, then attempts to discard using a non-existent timer ID. It verifies that the API correctly rejects this invalid operation with the appropriate conflict status code.
 *
 * 1. Authenticate as member using join endpoint
 * 2. Generate random UUID for non-existent timer ID
 * 3. Attempt to discard timer with non-existent ID
 * 4. Verify 409 Conflict HTTP error is thrown
 * 5. Validate error status code matches business rule expectation
 */
export async function test_api_timer_discard_no_active_timer(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as member
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IHrmMember.IJoin,
  });
  // 2. Generate non-existent timer ID
  const nonExistentTimerId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // 3-4. Attempt to discard and verify 409 Conflict error
  await TestValidator.httpError(
    "discard with no active timer returns 409",
    409,
    async () => {
      await api.functional.hrm.member.active_timers.discard(memberConnection, {
        timerId: nonExistentTimerId,
      });
    },
  );
}
