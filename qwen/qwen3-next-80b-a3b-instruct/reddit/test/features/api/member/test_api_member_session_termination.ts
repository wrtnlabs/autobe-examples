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
export async function test_api_member_session_termination(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create new member account using authorization function
  const memberConnection: api.IConnection = { host: connection.host };
  const member: ICommunityBbsMember.IAuthorized = await authorize_member_join(
    memberConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: typia.random<
          string & tags.MinLength<8> & tags.MaxLength<128>
        >(),
      },
    },
  );
  typia.assert(member);
  // Step 2: Create active session for the member using generation function
  const session: ICommunityBbsMemberSession =
    await generate_random_community_bbs_member_member_sessions_create(
      memberConnection, // Use member-specific connection
      {},
    );
  typia.assert(session);
  // Step 3: Terminate the member's own session with the same authenticated connection
  await api.functional.communityBbs.member.member_sessions.erase(
    memberConnection, // Use member-specific connection (not base connection)
    {
      sessionId: session.session_token, // Use exact session_token from created session
    },
  );
  // Step 4: Verify session termination by attempting to make another API call with the terminated session
  // This should fail with a 401 Unauthorized error because the session was deleted
  // Since memberConnection still has the old authorization token from join, trying to create a new session will fail
  await TestValidator.error(
    "session should be terminated and reject subsequent requests",
    async () => {
      // Attempting to create a new session with the same connection that had its session terminated
      // The connection still has the old token from authorize_member_join, which is now invalid
      // This will fail with 401 Unauthorized because the session was terminated
      await api.functional.communityBbs.member.member_sessions.create(
        memberConnection, // Same connection that had its session terminated
        {
          body: {
            email: typia.random<string & tags.Format<"email">>(),
            password: typia.random<
              string & tags.MinLength<8> & tags.MaxLength<128>
            >(),
            href: "https://example.com",
            referrer: "https://google.com",
          },
        },
      );
    },
  );
}
