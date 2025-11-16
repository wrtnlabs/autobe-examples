import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdminUserJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdminUserJoin";
import type { IDiscussionBoardAdminuser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdminuser";
import type { IDiscussionBoardAdminuserSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdminuserSession";

export async function test_api_admin_session_detail_not_found_for_unknown_session(
  connection: api.IConnection,
) {
  // 1. Join as a new adminUser to establish authentication context and get a valid adminUserId
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    display_name: RandomGenerator.name(),
    bio: null,
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IDiscussionBoardAdminUserJoin.IRequest;

  const authorized: IDiscussionBoardAdminuser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: joinBody,
    });
  typia.assert(authorized);

  const adminUserId: string & tags.Format<"uuid"> = authorized.id;

  // 2. Generate a random UUID to serve as a non-existent sessionId
  const unknownSessionId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();

  // 3. Call the session detail endpoint with a valid adminUserId but an unknown sessionId
  //    and assert that it results in an error (not found / forbidden), without leaking data.
  await TestValidator.error(
    "admin session detail must fail for unknown sessionId even when authenticated",
    async () => {
      await api.functional.discussionBoard.adminUser.adminUsers.sessions.at(
        connection,
        {
          adminUserId,
          sessionId: unknownSessionId,
        },
      );
    },
  );
}
