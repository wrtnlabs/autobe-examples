import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Test that discarding a non-existent timer returns 404 Not Found.
 *
 * **Setup:**
 * 1. Authenticate as a member via POST /hrmPlatform/auth/member/join
 * 2. Generate a random UUID that does not correspond to any existing timer
 *
 * **Execution:**
 * 3. Call DELETE /hrmPlatform/member/timers/{timerId} with the non-existent timer ID
 *
 * **Validation:**
 * 4. Verify response returns 404 Not Found
 *
 * **Business Logic Focus:**
 * - System properly validates timer existence before attempting deletion
 * - Non-existent timers cannot be discarded
 * - Error response does not reveal whether timer existed or belonged to another user
 */
export async function test_api_timer_discard_not_found(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as member
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IHrmPlatformMember.IJoin,
  });
  // 2. Generate non-existent timer ID
  const nonExistentTimerId = typia.random<string & tags.Format<"uuid">>();
  // 3-4. Attempt to discard non-existent timer and validate 404
  await TestValidator.httpError(
    "non-existent timer discard returns 404",
    404,
    async () => {
      await api.functional.hrmPlatform.member.timers.erase(memberConnection, {
        timerId: nonExistentTimerId,
      });
    },
  );
}
