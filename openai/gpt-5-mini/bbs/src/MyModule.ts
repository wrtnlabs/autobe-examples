import { Module } from "@nestjs/common";

import { AuthGuestController } from "./controllers/auth/guest/AuthGuestController";
import { AuthMemberController } from "./controllers/auth/member/AuthMemberController";
import { AuthMemberEmailVerifyController } from "./controllers/auth/member/email/verify/AuthMemberEmailVerifyController";
import { AuthMemberPasswordRequestController } from "./controllers/auth/member/password/request/AuthMemberPasswordRequestController";
import { AuthMemberPasswordResetController } from "./controllers/auth/member/password/reset/AuthMemberPasswordResetController";
import { AuthMemberPasswordChangeController } from "./controllers/auth/member/password/change/AuthMemberPasswordChangeController";
import { AuthMemberMfaEnableController } from "./controllers/auth/member/mfa/enable/AuthMemberMfaEnableController";
import { AuthMemberSessionsController } from "./controllers/auth/member/sessions/AuthMemberSessionsController";
import { AuthModeratorController } from "./controllers/auth/moderator/AuthModeratorController";
import { AuthModeratorPasswordChangeController } from "./controllers/auth/moderator/password/change/AuthModeratorPasswordChangeController";
import { AuthModeratorSessionsController } from "./controllers/auth/moderator/sessions/AuthModeratorSessionsController";
import { DiscussionboardCategoriesController } from "./controllers/discussionBoard/categories/DiscussionboardCategoriesController";
import { DiscussionboardModeratorCategoriesController } from "./controllers/discussionBoard/moderator/categories/DiscussionboardModeratorCategoriesController";
import { DiscussionboardTagsController } from "./controllers/discussionBoard/tags/DiscussionboardTagsController";
import { DiscussionboardModeratorTagsController } from "./controllers/discussionBoard/moderator/tags/DiscussionboardModeratorTagsController";
import { DiscussionboardModeratorSettingsController } from "./controllers/discussionBoard/moderator/settings/DiscussionboardModeratorSettingsController";
import { DiscussionboardArticlesController } from "./controllers/discussionBoard/articles/DiscussionboardArticlesController";
import { DiscussionboardMemberArticlesController } from "./controllers/discussionBoard/member/articles/DiscussionboardMemberArticlesController";
import { DiscussionboardModeratorArticlesVersionsController } from "./controllers/discussionBoard/moderator/articles/versions/DiscussionboardModeratorArticlesVersionsController";
import { DiscussionboardMemberArticlesAttachmentsController } from "./controllers/discussionBoard/member/articles/attachments/DiscussionboardMemberArticlesAttachmentsController";
import { DiscussionboardArticlesAttachmentsController } from "./controllers/discussionBoard/articles/attachments/DiscussionboardArticlesAttachmentsController";
import { DiscussionboardModeratorArticlesAttachmentsController } from "./controllers/discussionBoard/moderator/articles/attachments/DiscussionboardModeratorArticlesAttachmentsController";
import { DiscussionboardArticlesCommentsController } from "./controllers/discussionBoard/articles/comments/DiscussionboardArticlesCommentsController";
import { DiscussionboardMemberArticlesCommentsController } from "./controllers/discussionBoard/member/articles/comments/DiscussionboardMemberArticlesCommentsController";
import { DiscussionboardMemberArticlesCommentsAttachmentsController } from "./controllers/discussionBoard/member/articles/comments/attachments/DiscussionboardMemberArticlesCommentsAttachmentsController";
import { DiscussionboardArticlesCommentsAttachmentsController } from "./controllers/discussionBoard/articles/comments/attachments/DiscussionboardArticlesCommentsAttachmentsController";
import { DiscussionboardMemberArticlesTagsController } from "./controllers/discussionBoard/member/articles/tags/DiscussionboardMemberArticlesTagsController";
import { DiscussionboardMemberReportsController } from "./controllers/discussionBoard/member/reports/DiscussionboardMemberReportsController";
import { DiscussionboardModeratorReportsController } from "./controllers/discussionBoard/moderator/reports/DiscussionboardModeratorReportsController";
import { DiscussionboardModeratorArticlesReportsController } from "./controllers/discussionBoard/moderator/articles/reports/DiscussionboardModeratorArticlesReportsController";
import { DiscussionboardMemberCommentsReportsController } from "./controllers/discussionBoard/member/comments/reports/DiscussionboardMemberCommentsReportsController";
import { DiscussionboardModeratorModerationActionsController } from "./controllers/discussionBoard/moderator/moderation/actions/DiscussionboardModeratorModerationActionsController";
import { DiscussionboardMemberAppealsController } from "./controllers/discussionBoard/member/appeals/DiscussionboardMemberAppealsController";
import { DiscussionboardModeratorAppealsController } from "./controllers/discussionBoard/moderator/appeals/DiscussionboardModeratorAppealsController";
import { DiscussionboardSearchGlobalController } from "./controllers/discussionBoard/search/global/DiscussionboardSearchGlobalController";
import { DiscussionboardStatisticsArticle_activityController } from "./controllers/discussionBoard/statistics/article-activity/DiscussionboardStatisticsArticle_activityController";
import { DiscussionboardStatisticsArticles_by_monthController } from "./controllers/discussionBoard/statistics/articles-by-month/DiscussionboardStatisticsArticles_by_monthController";
import { DiscussionboardModeratorAuditlogsController } from "./controllers/discussionBoard/moderator/auditLogs/DiscussionboardModeratorAuditlogsController";
import { DiscussionboardModeratorAuditlogsAccessesController } from "./controllers/discussionBoard/moderator/auditLogs/accesses/DiscussionboardModeratorAuditlogsAccessesController";
import { DiscussionboardModeratorAuditlogaccessesController } from "./controllers/discussionBoard/moderator/auditLogAccesses/DiscussionboardModeratorAuditlogaccessesController";
import { DiscussionboardModeratorModerationauditsController } from "./controllers/discussionBoard/moderator/moderationAudits/DiscussionboardModeratorModerationauditsController";
import { DiscussionboardModeratorDashboardModerationoverviewController } from "./controllers/discussionBoard/moderator/dashboard/moderationOverview/DiscussionboardModeratorDashboardModerationoverviewController";
import { DiscussionboardModeratorModerationqueueController } from "./controllers/discussionBoard/moderator/moderationQueue/DiscussionboardModeratorModerationqueueController";
import { DiscussionboardModeratorMembersController } from "./controllers/discussionBoard/moderator/members/DiscussionboardModeratorMembersController";
import { DiscussionboardMembersController } from "./controllers/discussionBoard/members/DiscussionboardMembersController";
import { DiscussionboardMemberMembersController } from "./controllers/discussionBoard/member/members/DiscussionboardMemberMembersController";
import { DiscussionboardModeratorModeratorsController } from "./controllers/discussionBoard/moderator/moderators/DiscussionboardModeratorModeratorsController";
import { DiscussionboardModeratorGuestsController } from "./controllers/discussionBoard/moderator/guests/DiscussionboardModeratorGuestsController";
import { DiscussionboardGuestsController } from "./controllers/discussionBoard/guests/DiscussionboardGuestsController";
import { DiscussionboardMemberMembersSubscriptionsController } from "./controllers/discussionBoard/member/members/subscriptions/DiscussionboardMemberMembersSubscriptionsController";
import { DiscussionboardModeratorMembersSubscriptionsController } from "./controllers/discussionBoard/moderator/members/subscriptions/DiscussionboardModeratorMembersSubscriptionsController";
import { DiscussionboardMemberMembersNotificationsController } from "./controllers/discussionBoard/member/members/notifications/DiscussionboardMemberMembersNotificationsController";
import { DiscussionboardMemberMembersNotificationsFailuresController } from "./controllers/discussionBoard/member/members/notifications/failures/DiscussionboardMemberMembersNotificationsFailuresController";

@Module({
  controllers: [
    AuthGuestController,
    AuthMemberController,
    AuthMemberEmailVerifyController,
    AuthMemberPasswordRequestController,
    AuthMemberPasswordResetController,
    AuthMemberPasswordChangeController,
    AuthMemberMfaEnableController,
    AuthMemberSessionsController,
    AuthModeratorController,
    AuthModeratorPasswordChangeController,
    AuthModeratorSessionsController,
    DiscussionboardCategoriesController,
    DiscussionboardModeratorCategoriesController,
    DiscussionboardTagsController,
    DiscussionboardModeratorTagsController,
    DiscussionboardModeratorSettingsController,
    DiscussionboardArticlesController,
    DiscussionboardMemberArticlesController,
    DiscussionboardModeratorArticlesVersionsController,
    DiscussionboardMemberArticlesAttachmentsController,
    DiscussionboardArticlesAttachmentsController,
    DiscussionboardModeratorArticlesAttachmentsController,
    DiscussionboardArticlesCommentsController,
    DiscussionboardMemberArticlesCommentsController,
    DiscussionboardMemberArticlesCommentsAttachmentsController,
    DiscussionboardArticlesCommentsAttachmentsController,
    DiscussionboardMemberArticlesTagsController,
    DiscussionboardMemberReportsController,
    DiscussionboardModeratorReportsController,
    DiscussionboardModeratorArticlesReportsController,
    DiscussionboardMemberCommentsReportsController,
    DiscussionboardModeratorModerationActionsController,
    DiscussionboardMemberAppealsController,
    DiscussionboardModeratorAppealsController,
    DiscussionboardSearchGlobalController,
    DiscussionboardStatisticsArticle_activityController,
    DiscussionboardStatisticsArticles_by_monthController,
    DiscussionboardModeratorAuditlogsController,
    DiscussionboardModeratorAuditlogsAccessesController,
    DiscussionboardModeratorAuditlogaccessesController,
    DiscussionboardModeratorModerationauditsController,
    DiscussionboardModeratorDashboardModerationoverviewController,
    DiscussionboardModeratorModerationqueueController,
    DiscussionboardModeratorMembersController,
    DiscussionboardMembersController,
    DiscussionboardMemberMembersController,
    DiscussionboardModeratorModeratorsController,
    DiscussionboardModeratorGuestsController,
    DiscussionboardGuestsController,
    DiscussionboardMemberMembersSubscriptionsController,
    DiscussionboardModeratorMembersSubscriptionsController,
    DiscussionboardMemberMembersNotificationsController,
    DiscussionboardMemberMembersNotificationsFailuresController,
  ],
})
export class MyModule {}
