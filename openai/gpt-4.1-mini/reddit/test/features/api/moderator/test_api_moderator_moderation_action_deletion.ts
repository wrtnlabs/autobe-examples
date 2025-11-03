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

export async function test_api_moderator_moderation_action_deletion(
  connection: api.IConnection,
) {
  // 1. Create user by user join
  const userEmail: string = `${RandomGenerator.name(1).toLowerCase()}@example.com`;
  const user: IRedditCommunityUser.IAuthorized =
    await api.functional.auth.user.join(connection, {
      body: {
        email: userEmail,
        password: "password123",
        href: "http://localhost/",
        referrer: "http://localhost/",
        ip: null,
      } satisfies IRedditCommunityUser.ICreate,
    });
  typia.assert(user);

  // 2. Create moderator by moderator join
  const moderatorEmail: string = `${RandomGenerator.name(1).toLowerCase()}@example.com`;
  const moderatorJoinBody = {
    email: moderatorEmail,
    password: "password123",
    href: "http://localhost/",
    referrer: "http://localhost/",
    ip: null,
  } satisfies IRedditCommunityModerator.IJoin;
  const moderator: IRedditCommunityModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: moderatorJoinBody,
    });
  typia.assert(moderator);

  // 3. Create admin by admin join
  const adminEmail: string = `${RandomGenerator.name(1).toLowerCase()}@example.com`;
  // Admin join body includes email, password, href, referrer, ip
  const adminJoinBody = {
    email: adminEmail,
    password: "password123",
    href: "http://localhost/",
    referrer: "http://localhost/",
    ip: null,
  } satisfies IRedditCommunityUser.ICreate;

  const admin: IRedditCommunityAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        user_id: user.id,
      } satisfies IRedditCommunityAdmin.ICreate,
    });
  typia.assert(admin);

  // 4. Admin login for admin token
  await api.functional.auth.admin.login(connection, {
    body: {
      email: adminEmail,
      password: "password123",
      href: "http://localhost/",
      referrer: "http://localhost/",
      ip: null,
    } satisfies IRedditCommunityAdmin.ILogin,
  });

  // 5. Create moderator entity linked to created user
  const modCreate: IRedditCommunityModerator.ICreate = {
    user_id: user.id,
  };
  const createdMod: IRedditCommunityModerator =
    await api.functional.redditCommunity.admin.moderators.create(connection, {
      body: modCreate,
    });
  typia.assert(createdMod);

  // 6. Moderator login
  await api.functional.auth.moderator.login(connection, {
    body: {
      email: moderatorEmail,
      password: "password123",
      href: "http://localhost/",
      referrer: "http://localhost/",
      ip: null,
    } satisfies IRedditCommunityModerator.ILogin,
  });

  // 7. Create moderator session
  const nowISO = new Date().toISOString();
  const modSessionCreate: IRedditCommunityModeratorSession.ICreate = {
    reddit_community_moderator_id: createdMod.id,
    ip: "127.0.0.1",
    href: "http://localhost/dashboard",
    referrer: "http://localhost/home",
    created_at: nowISO,
    expired_at: null,
  };
  const modSession: IRedditCommunityModeratorSession =
    await api.functional.redditCommunity.moderator.moderators.sessions.create(
      connection,
      {
        moderatorId: createdMod.id,
        body: modSessionCreate,
      },
    );
  typia.assert(modSession);

  // 8. Create report reason with required properties
  const reportReasonCreate: IRedditCommunityReportReason.ICreate = {
    reason_code: "spam_report",
    reason_name: "Spam Report",
    description: "Flagged as spam by user",
    created_at: nowISO,
    updated_at: nowISO,
  };
  const reportReason: IRedditCommunityReportReason =
    await api.functional.redditCommunity.admin.redditCommunityReportReasons.create(
      connection,
      {
        body: reportReasonCreate,
      },
    );
  typia.assert(reportReason);

  // 9. Create content report submitted by user
  const contentReportCreate: IRedditCommunityContentReport.ICreate = {
    content_id: typia.random<string & tags.Format<"uuid">>(),
    report_reason_id: reportReason.id,
    content_type: "post",
    additional_details: "Excessive advertising",
  };
  const contentReport: IRedditCommunityContentReport =
    await api.functional.redditCommunity.user.content_reports.create(
      connection,
      {
        body: contentReportCreate,
      },
    );
  typia.assert(contentReport);

  // 10. Create moderation action by moderator linked to content report
  const modActionCreate: IRedditCommunityModerationAction.ICreate = {
    moderator_id: createdMod.id,
    content_report_id: contentReport.id,
    action_type: "deleted",
    action_notes: "Removed spam post",
  };
  const modAction: IRedditCommunityModerationAction =
    await api.functional.redditCommunity.moderator.moderators.actions.create(
      connection,
      {
        moderatorId: createdMod.id,
        body: modActionCreate,
      },
    );
  typia.assert(modAction);

  // 11. Delete the created moderation action
  await api.functional.redditCommunity.moderator.moderators.actions.erase(
    connection,
    {
      moderatorId: createdMod.id,
      moderationActionId: modAction.id,
    },
  );

  // 12. Attempt to delete again to confirm error handling
  await TestValidator.error(
    "Deleting non-existent moderation action throws error",
    async () => {
      await api.functional.redditCommunity.moderator.moderators.actions.erase(
        connection,
        {
          moderatorId: createdMod.id,
          moderationActionId: modAction.id,
        },
      );
    },
  );
}
