import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditCommunityCommentReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommentReport";
import type { IRedditCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityModerator";
import type { IRedditCommunityRegisteredUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityRegisteredUser";

export async function test_api_reddit_community_moderator_reddit_community_comment_reports_retrieve(
  connection: api.IConnection,
) {
  // Multi-actor authentication setup for moderator and registered user
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderatorPassword = "ModPass123!";
  const moderator: IRedditCommunityModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: moderatorEmail,
        password: moderatorPassword,
      } satisfies IRedditCommunityModerator.ICreate,
    });
  typia.assert(moderator);

  await api.functional.auth.moderator.login(connection, {
    body: {
      email: moderatorEmail,
      password: moderatorPassword,
      ip: null,
      href: "https://app.example.com/moderator/dashboard",
      referrer: "https://app.example.com/home",
    } satisfies IRedditCommunityModerator.ILogin,
  });

  const userEmail = typia.random<string & tags.Format<"email">>();
  const userPassword = "UserPass123!";
  const registeredUser: IRedditCommunityRegisteredUser.IAuthorized =
    await api.functional.auth.registeredUser.join(connection, {
      body: {
        email: userEmail,
        password: userPassword,
      } satisfies IRedditCommunityRegisteredUser.ICreate,
    });
  typia.assert(registeredUser);

  await api.functional.auth.registeredUser.login(connection, {
    body: {
      email: userEmail,
      password: userPassword,
      ip: null,
      href: "https://app.example.com/user/home",
      referrer: "https://app.example.com/landing",
    } satisfies IRedditCommunityRegisteredUser.ILogin,
  });

  // Create a reddit community registered user entity using the above email
  const createdUser: IRedditCommunityRegisteredUser =
    await api.functional.redditCommunity.redditCommunityRegisteredusers.create(
      connection,
      {
        body: {
          email: userEmail,
          password: userPassword,
        } satisfies IRedditCommunityRegisteredUser.ICreate,
      },
    );
  typia.assert(createdUser);
  TestValidator.equals(
    "Registered user email matches",
    createdUser.email,
    userEmail,
  );

  // Create a comment report with a randomized reddit_community_comment_id
  // Use current authentication (registeredUser) context
  const randomCommentId = typia.random<string & tags.Format<"uuid">>();
  const reportReason = RandomGenerator.paragraph({
    sentences: 3,
    wordMin: 4,
    wordMax: 8,
  });

  const createdReport: IRedditCommunityCommentReport =
    await api.functional.redditCommunity.registeredUser.redditCommunityCommentReports.create(
      connection,
      {
        body: {
          reason: reportReason,
          reddit_community_comment_id: randomCommentId,
        } satisfies IRedditCommunityCommentReport.ICreate,
      },
    );
  typia.assert(createdReport);
  TestValidator.equals(
    "Report reason matches",
    createdReport.reason,
    reportReason,
  );
  TestValidator.equals(
    "Report comment ID matches",
    createdReport.reddit_community_comment_id,
    randomCommentId,
  );
  TestValidator.equals(
    "Report registered user ID matches",
    createdReport.reddit_community_registereduser_id,
    createdUser.id,
  );

  // Switch to moderator authentication context
  // await api.functional.auth.moderator.login to re-authenticate
  await api.functional.auth.moderator.login(connection, {
    body: {
      email: moderatorEmail,
      password: moderatorPassword,
      ip: null,
      href: "https://app.example.com/moderator/dashboard",
      referrer: "https://app.example.com/home",
    } satisfies IRedditCommunityModerator.ILogin,
  });

  // Retrieve the report details as moderator
  const fetchedReport: IRedditCommunityCommentReport =
    await api.functional.redditCommunity.moderator.redditCommunityCommentReports.at(
      connection,
      {
        commentReportId: createdReport.id,
      },
    );
  typia.assert(fetchedReport);

  // Validate fetched report data matches created report
  TestValidator.equals(
    "Fetched report ID matches",
    fetchedReport.id,
    createdReport.id,
  );
  TestValidator.equals(
    "Fetched report reason matches",
    fetchedReport.reason,
    createdReport.reason,
  );
  TestValidator.equals(
    "Fetched report comment ID matches",
    fetchedReport.reddit_community_comment_id,
    createdReport.reddit_community_comment_id,
  );
  TestValidator.equals(
    "Fetched report registered user ID matches",
    fetchedReport.reddit_community_registereduser_id,
    createdReport.reddit_community_registereduser_id,
  );
  TestValidator.equals(
    "Fetched report user session ID matches",
    fetchedReport.reddit_community_registereduser_session_id,
    createdReport.reddit_community_registereduser_session_id,
  );
}
