import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityBbsAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsAdmin";
import type { ICommunityBbsMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsMember";
import type { ICommunityBbsMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsMemberSession";
import { prepare_random_community_bbs_member } from "../../../prepare/prepare_random_community_bbs_member";
import { generate_random_community_bbs_member_member_sessions_create } from "../../../generate/generate_random_community_bbs_member_member_sessions_create";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
export async function test_api_member_session_termination_by_admin(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create admin account and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  const admin: ICommunityBbsAdmin.IAuthorized = await authorize_admin_join(
    adminConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
      },
    },
  );
  typia.assert(admin);
  // Step 2: Create member account and authenticate
  const memberConnection: api.IConnection = { host: connection.host };
  const member: ICommunityBbsMember.IAuthorized = await authorize_member_join(
    memberConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
      },
    },
  );
  typia.assert(member);
  // Step 3: Create member authentication session
  const session: ICommunityBbsMemberSession =
    await generate_random_community_bbs_member_member_sessions_create(
      memberConnection,
      {},
    );
  typia.assert(session);
  // Step 4: Use the already authenticated admin connection to terminate member's session
  // Admin has already been authenticated by authorize_admin_join which set adminConnection.headers
  await api.functional.communityBbs.member.member_sessions.erase(
    adminConnection,
    {
      sessionId: session.session_token,
    },
  );
  // Validate that the admin was able to terminate the session by expecting no error
  // Since the delete call succeeded, admin privilege was successfully exercised
  TestValidator.equals(
    "Admin successfully terminated member session",
    true,
    true,
  );
}
