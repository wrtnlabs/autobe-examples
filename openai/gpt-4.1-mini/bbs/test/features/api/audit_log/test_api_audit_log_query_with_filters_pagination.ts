import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministrator";
import type { IDiscussionBoardAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAuditLog";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardAuditLog";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

export async function test_api_audit_log_query_with_filters_pagination(
  connection: api.IConnection,
): Promise<void> {
  // 1. Administrator join and obtain authorized connection
  const adminConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_administrator_join(adminConnection, {
    body: {},
  });
  adminConnection.headers ??= {};
  adminConnection.headers["Authorization"] = authorized.token.access;
  // 2. Basic query with empty filters, default pagination
  {
    const body: IDiscussionBoardAuditLog.IRequest = {};
    const response =
      await api.functional.discussionBoard.audit_logs.query.index(
        adminConnection,
        { body },
      );
    typia.assert(response);
    TestValidator.predicate(
      "pagination.current is positive",
      response.pagination.current > 0,
    );
    TestValidator.predicate(
      "pagination.limit is positive",
      response.pagination.limit > 0,
    );
    TestValidator.predicate(
      "pagination.records is zero or more",
      response.pagination.records >= 0,
    );
    TestValidator.predicate(
      "pagination.pages is zero or more",
      response.pagination.pages >= 0,
    );
    TestValidator.predicate("data array exists", Array.isArray(response.data));
  }
}
