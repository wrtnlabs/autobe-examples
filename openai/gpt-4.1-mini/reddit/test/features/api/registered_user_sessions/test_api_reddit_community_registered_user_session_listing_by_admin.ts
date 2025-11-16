import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCommunityRegisteredUserSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityRegisteredUserSession";
import type { IRedditCommunityAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityAdmin";
import type { IRedditCommunityAdminSettings } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityAdminSettings";
import type { IRedditCommunityRegisteredUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityRegisteredUser";
import type { IRedditCommunityRegisteredUserSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityRegisteredUserSession";

export async function test_api_reddit_community_registered_user_session_listing_by_admin(
  connection: api.IConnection,
) {
  // Step 1: Admin user authentication
  const adminCreateBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
  } satisfies IRedditCommunityAdmin.ICreate;
  const adminAuthorized: IRedditCommunityAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminCreateBody,
    });
  typia.assert(adminAuthorized);

  // Step 2: Create a registered user
  const registeredUserCreateBody = {
    username: RandomGenerator.name(2).replace(/\s+/g, "_").toLowerCase(),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
  } satisfies IRedditCommunityRegisteredUser.ICreate;
  const registeredUser: IRedditCommunityRegisteredUser =
    await api.functional.redditCommunity.redditCommunity.registeredUsers.create(
      connection,
      {
        body: registeredUserCreateBody,
      },
    );
  typia.assert(registeredUser);

  // Step 3: List registered user sessions by admin endpoint
  const requestBody: IRedditCommunityRegisteredUserSession.IRequest = {
    page: 1,
    limit: 20,
  };
  const pageSessions: IPageIRedditCommunityRegisteredUserSession.ISummary =
    await api.functional.redditCommunity.admin.redditCommunity.registeredUsers.registeredUserSessions.indexRegisteredUserSessions(
      connection,
      {
        id: registeredUser.id,
        body: requestBody,
      },
    );
  typia.assert(pageSessions);

  // Validate pagination properties
  TestValidator.predicate(
    "pagination current page is number and >= 1",
    typeof pageSessions.pagination.current === "number" &&
      pageSessions.pagination.current >= 1,
  );
  TestValidator.predicate(
    "pagination limit is number and > 0",
    typeof pageSessions.pagination.limit === "number" &&
      pageSessions.pagination.limit > 0,
  );
  TestValidator.predicate(
    "pagination records is number and >= 0",
    typeof pageSessions.pagination.records === "number" &&
      pageSessions.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages is number and >= 0",
    typeof pageSessions.pagination.pages === "number" &&
      pageSessions.pagination.pages >= 0,
  );

  // Validate data array
  TestValidator.predicate("data is array", Array.isArray(pageSessions.data));

  // If there are data items, validate individual properties
  if (pageSessions.data.length > 0) {
    for (const session of pageSessions.data) {
      typia.assert(session);
      TestValidator.predicate("session.id is defined", session.id.length > 0);
      TestValidator.equals(
        "session user_id matches requested id",
        session.user_id,
        registeredUser.id,
      );
      TestValidator.predicate(
        "session href is non-empty string",
        typeof session.href === "string" && session.href.length > 0,
      );
      TestValidator.predicate(
        "session referrer is non-empty string",
        typeof session.referrer === "string" && session.referrer.length > 0,
      );
      TestValidator.predicate(
        "session created_at is ISO string",
        typeof session.created_at === "string" &&
          !isNaN(Date.parse(session.created_at)),
      );
      TestValidator.predicate(
        "session updated_at is ISO string",
        typeof session.updated_at === "string" &&
          !isNaN(Date.parse(session.updated_at)),
      );
    }
  }
}
