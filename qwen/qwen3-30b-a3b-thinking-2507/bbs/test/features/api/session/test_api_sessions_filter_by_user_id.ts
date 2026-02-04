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

export async function test_api_sessions_filter_by_user_id(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create a member account
  const memberConnection: api.IConnection = { host: connection.host };
  const member: IEconPoliticBoardMember.IAuthorized =
    await authorize_member_join(memberConnection, {
      body: {} satisfies IEconPoliticBoardMember.IJoin,
    });
  // 2. Get sessions with user_id filter
  const sessions: IPageIEconPoliticBoardGuestSession =
    await api.functional.econPoliticBoard.member.sessions.index(
      memberConnection,
      {
        body: {
          user_id: member.id,
        } satisfies IEconPoliticBoardGuestSession.IRequest,
      },
    );
  typia.assert(sessions);
  // 3. Validate sessions belong to the user
  for (const session of sessions.data) {
    TestValidator.equals("session user_id matches", session.user_id, member.id);
  }
}
