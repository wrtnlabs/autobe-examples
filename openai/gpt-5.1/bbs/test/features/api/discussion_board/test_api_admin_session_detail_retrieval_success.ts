import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdminUserJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdminUserJoin";
import type { IDiscussionBoardAdminuser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdminuser";
import type { IDiscussionBoardAdminuserSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdminuserSession";

export async function test_api_admin_session_detail_retrieval_success(
  connection: api.IConnection,
) {
  // 1. Join as a new admin user to establish an authenticated adminUser context.
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    display_name: RandomGenerator.name(),
    bio: RandomGenerator.paragraph({ sentences: 3 }),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IDiscussionBoardAdminUserJoin.IRequest;

  const authorizedAdmin: IDiscussionBoardAdminuser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: joinBody,
    });
  typia.assert<IAuthorizationToken>(authorizedAdmin.token);
  typia.assert<IDiscussionBoardAdminuser.IAuthorized>(authorizedAdmin);

  const adminUserId: string & tags.Format<"uuid"> = authorizedAdmin.id;

  // 2. Choose a session id to request.
  // We don't have a listing API, so we use the adminUserId itself as a stable
  // identifier to drive the happy-path call. In simulate mode this will still
  // produce a valid session object; in real mode we only rely on shape
  // validation and id equality, not on DB-level existence guarantees.
  const sessionId: string & tags.Format<"uuid"> = adminUserId;

  // 3. Call the admin session detail endpoint.
  const session: IDiscussionBoardAdminuserSession =
    await api.functional.discussionBoard.adminUser.adminUsers.sessions.at(
      connection,
      {
        adminUserId,
        sessionId,
      },
    );
  typia.assert<IDiscussionBoardAdminuserSession>(session);

  // 4. Business-level validations.
  TestValidator.equals(
    "session id should equal requested sessionId",
    session.id,
    sessionId,
  );

  if (session.adminUser !== undefined) {
    typia.assert<IDiscussionBoardAdminuser.ISummary>(session.adminUser);

    TestValidator.equals(
      "session.adminUser.id should equal adminUserId",
      session.adminUser.id,
      adminUserId,
    );
  }

  TestValidator.predicate(
    "session.ip should be a non-empty string",
    session.ip.length > 0,
  );

  TestValidator.predicate(
    "session.href should be a non-empty string",
    session.href.length > 0,
  );

  TestValidator.predicate(
    "session.referrer should be a non-empty string",
    session.referrer.length > 0,
  );

  TestValidator.predicate(
    "session.created_at should be a non-empty string",
    session.created_at.length > 0,
  );

  if (session.expired_at !== undefined && session.expired_at !== null) {
    TestValidator.predicate(
      "session.expired_at, when present, should be a non-empty string",
      session.expired_at.length > 0,
    );
  }
}
