import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { ITodoAppMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Test password reset cancellation with a non-existent reset identifier.
 *
 * Validates that the system correctly responds with 404 Not Found when an
 * authenticated member attempts to cancel a password reset using a UUID that
 * does not correspond to any existing reset record. This covers the case
 * where a reset has never existed, has already been cancelled, or has been
 * consumed by a previous password change.
 *
 * 1. A member registers and authenticates via the join flow.
 * 2. The authenticated member attempts to cancel a password reset using a
 *    randomly generated UUID that does not match any record.
 * 3. Validates that the response is 404 Not Found, confirming proper
 *    handling of non-existent reset identifiers.
 */
export async function test_api_password_reset_cancellation_nonexistent(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate a member
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {});
  // 2. Attempt to cancel a non-existent password reset
  await TestValidator.httpError(
    "non-existent password reset returns 404",
    404,
    async () => {
      await api.functional.todoApp.member.password_resets.erase(
        memberConnection,
        {
          resetId: typia.random<string & tags.Format<"uuid">>(),
        },
      );
    },
  );
}
