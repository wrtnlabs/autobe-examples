import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardAdminSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdminSession";
import type { IDiscussionBoardSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardAdminSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardAdminSession";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_admin_session_list_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // Admin authentication
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  // Retrieve admin session list with default pagination
  const result =
    await api.functional.discussionBoard.admin.admin_sessions.index(
      adminConnection,
      {
        body: {
          page: 1,
          limit: 10,
          sortBy: "created_at",
          sortOrder: "desc",
        } satisfies IDiscussionBoardAdminSession.IRequest,
      },
    );
  // Validate response structure and narrow types
  const validatedResult = typia.assert(result);
  // Verify pagination structure exists
  TestValidator.predicate(
    "pagination exists",
    validatedResult.pagination !== undefined,
  );
  TestValidator.predicate("data exists", validatedResult.data !== undefined);
  // Verify pagination properties
  TestValidator.equals(
    "current page is 1",
    validatedResult.pagination.current,
    1,
  );
  TestValidator.equals("limit is 10", validatedResult.pagination.limit, 10);
  TestValidator.predicate(
    "records >= 0",
    validatedResult.pagination.records >= 0,
  );
  TestValidator.predicate("pages >= 0", validatedResult.pagination.pages >= 0);
  // Verify session data structure
  if (validatedResult.data && validatedResult.data.length > 0) {
    validatedResult.data.forEach((session) => {
      typia.assert(session);
      TestValidator.predicate("session has id", session.id !== undefined);
      TestValidator.predicate("session has ip", session.ip !== undefined);
      TestValidator.predicate("session has href", session.href !== undefined);
      TestValidator.predicate(
        "session has created_at",
        session.created_at !== undefined,
      );
      TestValidator.predicate(
        "session has expired_at",
        session.expired_at !== undefined,
      );
      TestValidator.predicate("session has admin", session.admin !== undefined);
      if (session.admin) {
        typia.assert(session.admin);
        TestValidator.predicate("admin has id", session.admin.id !== undefined);
        TestValidator.predicate(
          "admin has display_name",
          session.admin.display_name !== undefined,
        );
        TestValidator.predicate(
          "admin has email",
          session.admin.email !== undefined,
        );
      }
    });
  }
}
