import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import type { IHrmPlatformMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMemberSession";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_member_session_retrieval_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register new member (creates active session)
  const memberConnection: api.IConnection = { host: connection.host };
  const joinResult = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      display_name: RandomGenerator.name(),
      avatar_image: typia.random<string & tags.Format<"uri">>(),
      phone_number: RandomGenerator.mobile(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IHrmPlatformMember.IJoin,
  });
  typia.assert(joinResult);
  // 2. Generate session ID for retrieval (session created during join)
  const sessionId = typia.random<string & tags.Format<"uuid">>();
  // 3. Retrieve session details using authenticated member connection
  const session = await api.functional.hrmPlatform.member.sessions.at(
    memberConnection,
    {
      sessionId: sessionId,
    },
  );
  typia.assert(session);
  // 4. Validate member reference in session matches authenticated member
  TestValidator.equals("member ID matches", session.member.id, joinResult.id);
  TestValidator.equals(
    "display name matches",
    session.member.display_name,
    joinResult.display_name,
  );
  TestValidator.equals(
    "avatar image matches",
    session.member.avatar_image ?? null,
    joinResult.avatar_image ?? null,
  );
  TestValidator.equals(
    "phone number matches",
    session.member.phone_number ?? null,
    joinResult.phone_number ?? null,
  );
  // 5. Validate session expiration is after creation (business logic)
  TestValidator.predicate(
    "expiration after creation",
    new Date(session.expired_at) > new Date(session.created_at),
  );
}
