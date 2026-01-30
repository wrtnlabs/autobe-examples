import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityBbsMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsMember";
import type { ICommunityBbsMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsMemberSession";
import { prepare_random_community_bbs_member } from "../../../prepare/prepare_random_community_bbs_member";
import { generate_random_community_bbs_member_member_sessions_create } from "../../../generate/generate_random_community_bbs_member_member_sessions_create";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
export async function test_api_member_authentication(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create a new member account through join endpoint
  const memberConnection: api.IConnection = { host: connection.host };
  const memberJoinInput = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
  } satisfies ICommunityBbsMember.IJoin;
  const member: ICommunityBbsMember.IAuthorized = await authorize_member_join(
    memberConnection,
    { body: memberJoinInput },
  );
  typia.assert(member);
  // Step 2: Create a new authentication session with the valid credentials
  const authConnection: api.IConnection = { host: connection.host };
  const memberLoginInput = {
    email: member.email,
    password: memberJoinInput.password,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies ICommunityBbsMember.ICreate;
  const session: ICommunityBbsMemberSession =
    await generate_random_community_bbs_member_member_sessions_create(
      authConnection,
      { body: memberLoginInput },
    );
  typia.assert(session);
  // Step 3: Validate authentication session properties
  TestValidator.equals(
    "member_id matches member",
    session.member_id,
    member.id,
  );
  TestValidator.predicate(
    "session_token exists",
    session.session_token.length > 0,
  );
  TestValidator.predicate(
    "ip_address is valid IPv4",
    /^((25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/.test(
      session.ip_address,
    ),
  );
  TestValidator.predicate("user_agent exists", session.user_agent.length > 0);
  TestValidator.predicate(
    "created_at is valid date-time",
    /^d{4}-d{2}-d{2}Td{2}:d{2}:d{2}(?:\.d{1,9})?(?:Z|[+-]d{2}:d{2})$/.test(
      session.created_at,
    ),
  );
  TestValidator.predicate(
    "last_activity_at is valid date-time",
    /^d{4}-d{2}-d{2}Td{2}:d{2}:d{2}(?:\.d{1,9})?(?:Z|[+-]d{2}:d{2})$/.test(
      session.last_activity_at,
    ),
  );
  TestValidator.predicate(
    "expires_at is valid date-time",
    /^d{4}-d{2}-d{2}Td{2}:d{2}:d{2}(?:\.d{1,9})?(?:Z|[+-]d{2}:d{2})$/.test(
      session.expires_at,
    ),
  );
  TestValidator.predicate(
    "expires_at is in the future",
    new Date(session.expires_at) > new Date(),
  );
}
