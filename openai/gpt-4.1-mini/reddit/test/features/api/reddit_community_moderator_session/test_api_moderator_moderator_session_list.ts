import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCommunityModeratorSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityModeratorSession";
import type { IRedditCommunityAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityAdmin";
import type { IRedditCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityModerator";
import type { IRedditCommunityModeratorSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityModeratorSession";

export async function test_api_moderator_moderator_session_list(
  connection: api.IConnection,
) {
  // 1. Moderator Join and Authenticate
  const moderatorJoinParams: IRedditCommunityModerator.ICreate = {
    email: RandomGenerator.alphaNumeric(8) + "@moderator.com",
    password: "securePassword123",
  } satisfies IRedditCommunityModerator.ICreate;
  const moderator: IRedditCommunityModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: moderatorJoinParams,
    });
  typia.assert(moderator);

  // 2. Admin Join and Authenticate
  const adminJoinParams: IRedditCommunityAdmin.IJoin = {
    email: RandomGenerator.alphaNumeric(8) + "@admin.com",
    password: "adminPassword123",
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com",
  } satisfies IRedditCommunityAdmin.IJoin;
  const admin: IRedditCommunityAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinParams,
    });
  typia.assert(admin);

  // 3. Admin creates a new Reddit Community Moderator account
  const redditModeratorCreateParams: IRedditCommunityModerator.ICreate = {
    email: RandomGenerator.alphaNumeric(8) + "@redditmod.com",
    password: "modPassword123",
  } satisfies IRedditCommunityModerator.ICreate;
  const createdModerator: IRedditCommunityModerator =
    await api.functional.redditCommunity.admin.redditCommunityModerators.create(
      connection,
      {
        body: redditModeratorCreateParams,
      },
    );
  typia.assert(createdModerator);

  // 4. Moderator logs in to switch context
  const moderatorLoginParams: IRedditCommunityModerator.ILogin = {
    email: moderator.email,
    password: moderatorJoinParams.password,
    href: "https://moderator.example.com/login",
    referrer: "https://moderator.example.com",
  } satisfies IRedditCommunityModerator.ILogin;
  const loginModerator: IRedditCommunityModerator.IAuthorized =
    await api.functional.auth.moderator.login(connection, {
      body: moderatorLoginParams,
    });
  typia.assert(loginModerator);

  // 5. Moderator requests session listing
  const sessionRequestBody: IRedditCommunityModeratorSession.IRequest = {
    page: 1,
    limit: 10,
    orderBy: "created_at",
    orderDirection: "desc",
  } satisfies IRedditCommunityModeratorSession.IRequest;
  const sessionList: IPageIRedditCommunityModeratorSession.ISummary =
    await api.functional.redditCommunity.moderator.redditCommunityModerators.sessions.index(
      connection,
      {
        redditCommunityModeratorId: createdModerator.id,
        body: sessionRequestBody,
      },
    );
  typia.assert(sessionList);

  // 6. Validate pagination and sessions data
  const { pagination, data } = sessionList;
  TestValidator.predicate(
    "pagination current page is 1",
    pagination.current === 1,
  );
  TestValidator.predicate("pagination limit is 10", pagination.limit === 10);
  TestValidator.predicate("pagination pages is positive", pagination.pages > 0);
  TestValidator.predicate(
    "pagination records is non-negative",
    pagination.records >= 0,
  );
  TestValidator.predicate(
    "session data array length is less or equal to limit",
    data.length <= pagination.limit,
  );

  // Validate each session item
  for (const session of data) {
    typia.assert(session);
    TestValidator.predicate(
      "session id is valid UUID",
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        session.id,
      ),
    );
    TestValidator.predicate("session ip is not empty", session.ip.length > 0);
    TestValidator.predicate(
      "session href is valid URI",
      /^https?:\/\/.+/.test(session.href),
    );
    TestValidator.predicate(
      "session referrer is valid URI",
      /^https?:\/\/.*/.test(session.referrer),
    );
    TestValidator.predicate(
      "session created_at is valid ISO datetime",
      !isNaN(Date.parse(session.created_at)),
    );
    TestValidator.predicate(
      "session expired_at is null or valid ISO datetime",
      session.expired_at === null || !isNaN(Date.parse(session.expired_at)),
    );
  }
}
