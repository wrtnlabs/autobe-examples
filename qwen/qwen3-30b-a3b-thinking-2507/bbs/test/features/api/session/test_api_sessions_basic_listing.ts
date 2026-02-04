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

export async function test_api_sessions_basic_listing(
  connection: api.IConnection,
): Promise<void> {
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: `${RandomGenerator.alphaNumeric(8)}@example.com`,
      password: "password123",
    },
  });
  const response: IPageIEconPoliticBoardGuestSession =
    await api.functional.econPoliticBoard.member.sessions.index(
      memberConnection,
      {
        body: typia.random<IEconPoliticBoardGuestSession.IRequest>(),
      },
    );
  typia.assert(response);
  TestValidator.predicate(
    "response should have sessions",
    response.data.length > 0,
  );
  for (const session of response.data) {
    TestValidator.predicate(
      `session ${session.id} should have valid UUID format`,
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(
        session.id,
      ),
    );
    TestValidator.predicate(
      `session ${session.id} should have valid user ID (UUID)`,
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(
        session.user_id,
      ),
    );
    TestValidator.predicate(
      `session ${session.id} should have valid IP format`,
      /^\\d{1,3}\\.\\d{1,3}\\.\\d{1,3}\\.\\d{1,3}$/.test(session.ip_address),
    );
    TestValidator.predicate(
      `session ${session.id} should have valid creation timestamp format`,
      /^\\d{4}-\\d{2}-\\d{2}T\\d{2}:\\d{2}:\\d{2}\\.\\d{3}Z$/.test(
        session.created_at,
      ),
    );
    TestValidator.predicate(
      `session ${session.id} should have valid expiration timestamp format`,
      /^\\d{4}-\\d{2}-\\d{2}T\\d{2}:\\d{2}:\\d{2}\\.\\d{3}Z$/.test(
        session.expires_at,
      ),
    );
    TestValidator.predicate(
      `session ${session.id} should have valid device identifier`,
      session.device_identifier.length > 0,
    );
  }
}
