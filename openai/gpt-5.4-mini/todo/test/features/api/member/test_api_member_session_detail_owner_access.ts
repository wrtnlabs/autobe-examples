import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { ITodoAppGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppGuest";
import type { ITodoAppMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMember";
import type { ITodoAppMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMemberSession";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_guest_join } from "../../../authorize/authorize_guest_join";
import { authorize_guest_refresh } from "../../../authorize/authorize_guest_refresh";

export async function test_api_member_session_detail_owner_access(
  connection: api.IConnection,
): Promise<void> {
  const memberConnection: api.IConnection = { host: connection.host };
  const memberEmail = `${RandomGenerator.alphabets(8)}@test.com`;
  const memberPassword = RandomGenerator.alphaNumeric(12);
  const joined = await api.functional.todoApp.auth.member.join(
    memberConnection,
    {
      body: {
        email: memberEmail,
        password: true,
      } satisfies ITodoAppMember.IJoin,
    },
  );
  typia.assert(joined);
  const sessionId = typia.random<string & tags.Format<"uuid">>();
  const session = await api.functional.todoApp.guest.sessions.at(
    memberConnection,
    {
      sessionId,
    },
  );
  typia.assert(session);
  TestValidator.equals(
    "session id should match requested session id",
    session.id,
    sessionId,
  );
  TestValidator.equals(
    "session member id should match current member id",
    session.member.id,
    joined.id,
  );
  TestValidator.equals(
    "session member email should match current member email",
    session.member.email,
    joined.email,
  );
  TestValidator.equals(
    "session member created_at should match current member created_at",
    session.member.created_at,
    joined.created_at,
  );
  TestValidator.equals(
    "session member updated_at should match current member updated_at",
    session.member.updated_at,
    joined.updated_at,
  );
  TestValidator.equals(
    "session member deleted_at should match current member deleted_at",
    session.member.deleted_at,
    joined.deleted_at,
  );
  TestValidator.equals(
    "session creation timestamp should be preserved",
    session.created_at,
    session.created_at,
  );
  TestValidator.equals(
    "session expiration timestamp should be preserved",
    session.expired_at,
    session.expired_at,
  );
  TestValidator.equals(
    "session ip should be preserved",
    session.ip,
    session.ip,
  );
  TestValidator.equals(
    "session href should be preserved",
    session.href,
    session.href,
  );
  TestValidator.equals(
    "session referrer should be preserved",
    session.referrer,
    session.referrer,
  );
}
