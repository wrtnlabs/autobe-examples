import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconPoliticBoardGuestSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticBoardGuestSession";
import type { IEconPoliticBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticBoardMember";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEconPoliticBoardGuestSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEconPoliticBoardGuestSession";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_sessions_filter_by_status(
  connection: api.IConnection,
): Promise<void> {
  // Authenticate as member for session operations
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {},
  });
  // Filter for active sessions
  const activeResult: IPageIEconPoliticBoardGuestSession =
    await api.functional.econPoliticBoard.member.sessions.index(
      memberConnection,
      {
        body: {
          status: "active",
        } satisfies IEconPoliticBoardGuestSession.IRequest,
      },
    );
  typia.assert(activeResult);
  // Filter for inactive (expired) sessions
  const inactiveResult: IPageIEconPoliticBoardGuestSession =
    await api.functional.econPoliticBoard.member.sessions.index(
      memberConnection,
      {
        body: {
          status: "expired",
        } satisfies IEconPoliticBoardGuestSession.IRequest,
      },
    );
  typia.assert(inactiveResult);
  // Validate that we found at least one active session
  TestValidator.predicate(
    "active sessions should exist",
    activeResult.pagination.records > 0,
  );
  // Validate that we found at least one inactive (expired) session
  TestValidator.predicate(
    "inactive sessions should exist",
    inactiveResult.pagination.records > 0,
  );
}
