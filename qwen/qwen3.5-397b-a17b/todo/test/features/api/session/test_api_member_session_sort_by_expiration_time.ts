import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageITodoAppMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoAppMemberSession";
import type { ITodoAppMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMember";
import type { ITodoAppMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMemberSession";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Test that a member can sort their sessions by expiration time in different directions.
 *
 * Test Flow:
 * 1. Member joins with email and password (creates initial session via authorize_member_join utility)
 * 2. Query sessions with sort="expired_at" and direction="asc" (earliest expiration first)
 * 3. Query sessions with sort="expired_at" and direction="desc" (latest expiration first)
 * 4. Validate response structure and ordering when multiple sessions exist
 * 5. Verify pagination metadata is correctly returned
 *
 * This validates the business requirement for users to identify sessions that are about
 * to expire or have the longest remaining validity, supporting security management workflows.
 */
export async function test_api_member_session_sort_by_expiration_time(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member registration using utility function
  const memberConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: `192.168.${randint(0, 255)}.${randint(1, 254)}`,
    } satisfies ITodoAppMember.IJoin,
  });
  typia.assert(authorized);
  // 2. Query sessions sorted by expiration time ascending (earliest first)
  const ascResult = await api.functional.todoApp.member.sessions.index(
    memberConnection,
    {
      body: {
        sort: "expired_at",
        direction: "asc",
      } satisfies ITodoAppMemberSession.IRequest,
    },
  );
  typia.assert(ascResult);
  // 3. Query sessions sorted by expiration time descending (latest first)
  const descResult = await api.functional.todoApp.member.sessions.index(
    memberConnection,
    {
      body: {
        sort: "expired_at",
        direction: "desc",
      } satisfies ITodoAppMemberSession.IRequest,
    },
  );
  typia.assert(descResult);
  // 4. Validate response structure
  TestValidator.predicate(
    "pagination exists",
    ascResult.pagination !== undefined,
  );
  TestValidator.predicate("data array exists", Array.isArray(ascResult.data));
  // 5. Validate ordering when multiple sessions exist
  if (ascResult.data.length >= 2) {
    for (let i = 0; i < ascResult.data.length - 1; i++) {
      const currentTime = new Date(ascResult.data[i].expired_at).getTime();
      const nextTime = new Date(ascResult.data[i + 1].expired_at).getTime();
      TestValidator.predicate(
        `asc order: session ${i} expires before session ${i + 1}`,
        currentTime <= nextTime,
      );
    }
  }
  if (descResult.data.length >= 2) {
    for (let i = 0; i < descResult.data.length - 1; i++) {
      const currentTime = new Date(descResult.data[i].expired_at).getTime();
      const nextTime = new Date(descResult.data[i + 1].expired_at).getTime();
      TestValidator.predicate(
        `desc order: session ${i} expires after session ${i + 1}`,
        currentTime >= nextTime,
      );
    }
  }
  // 6. Validate pagination metadata
  TestValidator.predicate(
    "current page is positive",
    ascResult.pagination.current >= 1,
  );
  TestValidator.predicate("limit is positive", ascResult.pagination.limit > 0);
  TestValidator.predicate(
    "records count is non-negative",
    ascResult.pagination.records >= 0,
  );
}
