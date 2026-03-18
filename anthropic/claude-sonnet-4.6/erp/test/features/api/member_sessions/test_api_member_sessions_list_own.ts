import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import type { IErpHrmMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMemberSession";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIErpHrmMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIErpHrmMemberSession";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_member_sessions_list_own(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new member (creates first session entry)
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {});
  // 2. Call sessions list with no filters
  const result = await api.functional.erpHrm.member.sessions.index(
    memberConnection,
    {
      body: {} satisfies IErpHrmMemberSession.IRequest,
    },
  );
  typia.assert(result);
  // 3. Verify pagination defaults
  TestValidator.predicate(
    "records >= 1 (join session exists)",
    result.pagination.records >= 1,
  );
  TestValidator.equals(
    "pagination.current equals 1",
    result.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination.limit equals default 20",
    result.pagination.limit,
    20,
  );
  TestValidator.predicate("data has at least 1 item", result.data.length >= 1);
  // 4. Pagination test with limit=5
  const paginatedResult = await api.functional.erpHrm.member.sessions.index(
    memberConnection,
    {
      body: {
        page: 1,
        limit: 5,
      } satisfies IErpHrmMemberSession.IRequest,
    },
  );
  typia.assert(paginatedResult);
  TestValidator.equals(
    "pagination.limit equals 5",
    paginatedResult.pagination.limit,
    5,
  );
  TestValidator.predicate("data.length <= 5", paginatedResult.data.length <= 5);
  TestValidator.equals(
    "pagination.current equals 1",
    paginatedResult.pagination.current,
    1,
  );
}
