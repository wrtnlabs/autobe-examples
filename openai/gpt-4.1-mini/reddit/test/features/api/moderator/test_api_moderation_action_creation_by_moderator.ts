import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditCommunityAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityAdmin";
import type { IRedditCommunityComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityComment";
import type { IRedditCommunityCommentVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommentVote";
import type { IRedditCommunityContentReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityContentReport";
import type { IRedditCommunityModerationAction } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityModerationAction";
import type { IRedditCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityModerator";
import type { IRedditCommunityModeratorSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityModeratorSession";
import type { IRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPost";
import type { IRedditCommunityPostVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPostVote";
import type { IRedditCommunityReportReason } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityReportReason";
import type { IRedditCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunitySubscription";
import type { IRedditCommunityUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityUser";
import type { IRedditCommunityUserSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityUserSession";

// 1. Moderator user registers with email and password
// 2. Moderator user logs in to obtain authorization token
// 3. Admin user registers and logs in (to create moderator entity linking to user)
// 4. Create moderator entity linking the moderator user
// 5. Create moderator session with proper connection metadata
// 6. Create a report reason
// 7. Create a standard user who reports content
// 8. Standard user creates a content report with a valid reason
// 9. Moderator submits a moderation action against the content report
// 10. Validate that the moderation action is correctly created and linked

export async function test_api_moderation_action_creation_by_moderator(
  connection: api.IConnection,
) {
  // 1. Moderator user registers with email and password
  const moderatorEmail: string = typia.random<string & tags.Format<"email">>();
  const moderatorUser: IRedditCommunityUser.IAuthorized =
    await api.functional.auth.user.join(connection, {
      body: {
        email: moderatorEmail,
        password: "ModPass1234!",
        ip: "127.0.0.1",
        href: "https://reddit.example.com/moderator/join",
        referrer: "https://reddit.example.com",
      } satisfies IRedditCommunityUser.ICreate,
    });
  typia.assert(moderatorUser);

  // 2. Moderator user logs in
  const moderatorLogin: IRedditCommunityUser.IAuthorized =
    await api.functional.auth.user.login(connection, {
      body: {
        email: moderatorEmail,
        password: "ModPass1234!",
        ip: "127.0.0.1",
        href: "https://reddit.example.com/moderator/login",
        referrer: "https://reddit.example.com",
      } satisfies IRedditCommunityUser.ILogin,
    });
  typia.assert(moderatorLogin);

  // 3. Admin user registers and logs in
  const adminEmail: string = typia.random<string & tags.Format<"email">>();
  const adminUser: IRedditCommunityUser.IAuthorized =
    await api.functional.auth.user.join(connection, {
      body: {
        email: adminEmail,
        password: "AdminPass4321!",
        ip: "127.0.0.1",
        href: "https://reddit.example.com/admin/join",
        referrer: "https://reddit.example.com",
      } satisfies IRedditCommunityUser.ICreate,
    });
  typia.assert(adminUser);

  const adminLogin: IRedditCommunityUser.IAuthorized =
    await api.functional.auth.user.login(connection, {
      body: {
        email: adminEmail,
        password: "AdminPass4321!",
        ip: "127.0.0.1",
        href: "https://reddit.example.com/admin/login",
        referrer: "https://reddit.example.com",
      } satisfies IRedditCommunityUser.ILogin,
    });
  typia.assert(adminLogin);

  // 4. Admin creates moderator entity linked to the moderator user
  // Switch connection context to admin before creating moderator
  await api.functional.auth.admin.login(connection, {
    body: {
      email: adminEmail,
      password: "AdminPass4321!",
      ip: "127.0.0.1",
      href: "https://reddit.example.com/admin/login",
      referrer: "https://reddit.example.com",
    } satisfies IRedditCommunityAdmin.ILogin,
  });

  const moderatorEntity: IRedditCommunityModerator =
    await api.functional.redditCommunity.admin.moderators.create(connection, {
      body: {
        user_id: moderatorUser.id,
      } satisfies IRedditCommunityModerator.ICreate,
    });
  typia.assert(moderatorEntity);

  // 5. Moderator user logs in as moderator actor
  await api.functional.auth.moderator.login(connection, {
    body: {
      email: moderatorEmail,
      password: "ModPass1234!",
      ip: "127.0.0.1",
      href: "https://reddit.example.com/moderator/login",
      referrer: "https://reddit.example.com",
    } satisfies IRedditCommunityModerator.ILogin,
  });

  // 6. Create a moderator session
  const moderatorSession: IRedditCommunityModeratorSession =
    await api.functional.redditCommunity.moderator.moderators.sessions.create(
      connection,
      {
        moderatorId: moderatorEntity.id,
        body: {
          reddit_community_moderator_id: moderatorEntity.id,
          ip: "127.0.0.1",
          href: "https://reddit.example.com/moderator/session/start",
          referrer: "https://reddit.example.com",
          created_at: new Date().toISOString(),
          expired_at: null,
        } satisfies IRedditCommunityModeratorSession.ICreate,
      },
    );
  typia.assert(moderatorSession);

  // 7. Admin creates a report reason
  const reportReasonName = "Spam";
  const reportReasonCode = "SPAM";
  const timestampNow = new Date().toISOString();

  const reportReason: IRedditCommunityReportReason =
    await api.functional.redditCommunity.admin.redditCommunityReportReasons.create(
      connection,
      {
        body: {
          reason_code: reportReasonCode,
          reason_name: reportReasonName,
          description: "Content contains unsolicited advertisements",
          created_at: timestampNow,
          updated_at: timestampNow,
        } satisfies IRedditCommunityReportReason.ICreate,
      },
    );
  typia.assert(reportReason);

  // 8. Create a standard user who will report content
  const standardUserEmail: string = typia.random<
    string & tags.Format<"email">
  >();
  const standardUser: IRedditCommunityUser.IAuthorized =
    await api.functional.auth.user.join(connection, {
      body: {
        email: standardUserEmail,
        password: "UserPass5678!",
        ip: "127.0.0.1",
        href: "https://reddit.example.com/user/join",
        referrer: "https://reddit.example.com",
      } satisfies IRedditCommunityUser.ICreate,
    });
  typia.assert(standardUser);

  // 9. Standard user creates a content report with valid reason
  await api.functional.auth.user.login(connection, {
    body: {
      email: standardUserEmail,
      password: "UserPass5678!",
      ip: "127.0.0.1",
      href: "https://reddit.example.com/user/login",
      referrer: "https://reddit.example.com",
    } satisfies IRedditCommunityUser.ILogin,
  });

  const contentReport: IRedditCommunityContentReport =
    await api.functional.redditCommunity.user.content_reports.create(
      connection,
      {
        body: {
          content_id: typia.random<string & tags.Format<"uuid">>(),
          report_reason_id: reportReason.id,
          content_type: "post",
          additional_details: "Reported for spam content",
        } satisfies IRedditCommunityContentReport.ICreate,
      },
    );
  typia.assert(contentReport);

  // 10. Moderator submits a moderation action against the content report
  const actionType = "deleted";
  const actionNotes = "Removed spam content pursuant to policy.";

  const moderationAction: IRedditCommunityModerationAction =
    await api.functional.redditCommunity.moderator.moderators.actions.create(
      connection,
      {
        moderatorId: moderatorEntity.id,
        body: {
          moderator_id: moderatorEntity.id,
          content_report_id: contentReport.id,
          action_type: actionType,
          action_notes: actionNotes,
        } satisfies IRedditCommunityModerationAction.ICreate,
      },
    );
  typia.assert(moderationAction);

  // Validate critical linkage and audit properties
  TestValidator.equals(
    "moderator IDs match",
    moderationAction.moderator_id,
    moderatorEntity.id,
  );
  TestValidator.equals(
    "content report IDs match",
    moderationAction.content_report_id,
    contentReport.id,
  );
  TestValidator.equals(
    "action type is deleted",
    moderationAction.action_type,
    actionType,
  );
  TestValidator.equals(
    "action notes match",
    moderationAction.action_notes,
    actionNotes,
  );
  TestValidator.predicate(
    "created_at is ISO date string",
    typeof moderationAction.created_at === "string" &&
      !Number.isNaN(Date.parse(moderationAction.created_at)),
  );
  TestValidator.predicate(
    "updated_at is ISO date string",
    typeof moderationAction.updated_at === "string" &&
      !Number.isNaN(Date.parse(moderationAction.updated_at)),
  );
}
