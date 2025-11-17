import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditCommunityAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityAdmin";
import type { IRedditCommunityCommentReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommentReport";
import type { IRedditCommunityRegisteredUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityRegisteredUser";

export async function test_api_reddit_community_admin_reddit_community_comment_report_retrieval(
  connection: api.IConnection,
) {
  // 1. Admin joins and obtains auth token
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(8),
    href: RandomGenerator.substring("http://localhost/adminJoin"),
    referrer: RandomGenerator.substring("http://localhost/referrer"),
  } satisfies IRedditCommunityAdmin.IJoin;
  const admin: IRedditCommunityAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(admin);

  // 2. Admin login for actor switching
  const adminLoginBody = {
    username: adminJoinBody.email,
    password: adminJoinBody.password,
    href: RandomGenerator.substring("http://localhost/adminLogin"),
    referrer: RandomGenerator.substring("http://localhost/referrer"),
  } satisfies IRedditCommunityAdmin.ILogin;
  await api.functional.auth.admin.login(connection, { body: adminLoginBody });

  // 3. Registered user joins and obtains auth token
  const registeredUserJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(8),
  } satisfies IRedditCommunityRegisteredUser.ICreate;
  const registeredUser: IRedditCommunityRegisteredUser.IAuthorized =
    await api.functional.auth.registeredUser.join(connection, {
      body: registeredUserJoinBody,
    });
  typia.assert(registeredUser);

  // 4. Registered user login for actor switching
  const registeredUserLoginBody = {
    email: registeredUserJoinBody.email,
    password: registeredUserJoinBody.password,
    href: RandomGenerator.substring("http://localhost/userLogin"),
    referrer: RandomGenerator.substring("http://localhost/referrer"),
  } satisfies IRedditCommunityRegisteredUser.ILogin;
  await api.functional.auth.registeredUser.login(connection, {
    body: registeredUserLoginBody,
  });

  // 5. Registered user creates a comment report
  const commentReportCreateBody = {
    reason: RandomGenerator.paragraph({
      sentences: 5,
      wordMin: 4,
      wordMax: 10,
    }),
    reddit_community_comment_id: typia.random<string & tags.Format<"uuid">>(),
  } satisfies IRedditCommunityCommentReport.ICreate;

  const createdReport: IRedditCommunityCommentReport =
    await api.functional.redditCommunity.registeredUser.redditCommunityCommentReports.create(
      connection,
      { body: commentReportCreateBody },
    );
  typia.assert(createdReport);

  // 6. Admin user login again for admin operations
  await api.functional.auth.admin.login(connection, { body: adminLoginBody });

  // 7. Admin retrieves the comment report by ID
  const retrievedReport: IRedditCommunityCommentReport =
    await api.functional.redditCommunity.admin.redditCommunityCommentReports.at(
      connection,
      { commentReportId: createdReport.id },
    );
  typia.assert(retrievedReport);

  // 8. Verify the retrieved data matches the created report
  TestValidator.equals(
    "retrieved comment report ID matches created",
    retrievedReport.id,
    createdReport.id,
  );
  TestValidator.equals(
    "retrieved comment report reason matches created",
    retrievedReport.reason,
    createdReport.reason,
  );
  TestValidator.equals(
    "retrieved comment report reddit_community_comment_id matches created",
    retrievedReport.reddit_community_comment_id,
    createdReport.reddit_community_comment_id,
  );
  TestValidator.equals(
    "retrieved comment report reddit_community_registereduser_id matches created",
    retrievedReport.reddit_community_registereduser_id,
    createdReport.reddit_community_registereduser_id,
  );
  TestValidator.equals(
    "retrieved comment report reddit_community_registereduser_session_id matches created",
    retrievedReport.reddit_community_registereduser_session_id,
    createdReport.reddit_community_registereduser_session_id,
  );
}
