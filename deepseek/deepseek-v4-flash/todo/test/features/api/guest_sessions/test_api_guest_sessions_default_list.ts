import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageITodoAppMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoAppMemberSession";
import type { ITodoAppGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppGuest";
import type { ITodoAppMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMemberSession";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_guest_join } from "../../../authorize/authorize_guest_join";
import { authorize_guest_refresh } from "../../../authorize/authorize_guest_refresh";

export async function test_api_guest_sessions_default_list(
  connection: api.IConnection,
): Promise<void> {
  // 1. Join as guest via authorize_guest_join utility
  const guestConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_guest_join(guestConnection, {});
  typia.assert(authorized);
  // 2. Call PATCH /todoApp/guest/sessions with empty request body (no filters)
  const page: IPageITodoAppMemberSession.ISummary =
    await api.functional.todoApp.guest.sessions.index(guestConnection, {
      body: {} satisfies ITodoAppMemberSession.IRequest,
    });
  typia.assert(page);
  // 3. Verify data array is non-empty (our newly created session should be there)
  TestValidator.predicate(
    "data array is non-empty",
    () => page.data.length > 0,
  );
  // 4. Verify each session entry is structurally valid
  for (const session of page.data) {
    typia.assert(session);
  }
  // 5. Verify sessions are sorted by created_at in descending order (most recent first)
  for (let i = 1; i < page.data.length; i++) {
    TestValidator.predicate(
      "sessions sorted by created_at descending",
      () =>
        new Date(page.data[i - 1].created_at).getTime() >=
        new Date(page.data[i].created_at).getTime(),
    );
  }
}
