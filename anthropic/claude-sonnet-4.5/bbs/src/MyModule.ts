import { Module } from "@nestjs/common";

import { AuthGuestController } from "./controllers/auth/guest/AuthGuestController";
import { AuthMemberController } from "./controllers/auth/member/AuthMemberController";
import { AuthMemberEmailVerifyController } from "./controllers/auth/member/email/verify/AuthMemberEmailVerifyController";
import { AuthMemberPasswordResetController } from "./controllers/auth/member/password/reset/AuthMemberPasswordResetController";
import { AuthMemberPasswordResetCompleteController } from "./controllers/auth/member/password/reset/complete/AuthMemberPasswordResetCompleteController";
import { AuthMemberPasswordChangeController } from "./controllers/auth/member/password/change/AuthMemberPasswordChangeController";
import { AuthModeratorController } from "./controllers/auth/moderator/AuthModeratorController";
import { AuthModeratorPasswordResetRequestController } from "./controllers/auth/moderator/password/reset/request/AuthModeratorPasswordResetRequestController";
import { AuthModeratorPasswordResetConfirmController } from "./controllers/auth/moderator/password/reset/confirm/AuthModeratorPasswordResetConfirmController";
import { AuthModeratorEmailVerifyRequestController } from "./controllers/auth/moderator/email/verify/request/AuthModeratorEmailVerifyRequestController";
import { AuthModeratorEmailVerifyConfirmController } from "./controllers/auth/moderator/email/verify/confirm/AuthModeratorEmailVerifyConfirmController";
import { AuthModeratorPasswordChangeController } from "./controllers/auth/moderator/password/change/AuthModeratorPasswordChangeController";
import { DiscussionboardModeratorMembersController } from "./controllers/discussionBoard/moderator/members/DiscussionboardModeratorMembersController";
import { DiscussionboardMemberMembersController } from "./controllers/discussionBoard/member/members/DiscussionboardMemberMembersController";
import { DiscussionboardMembersArticlesController } from "./controllers/discussionBoard/members/articles/DiscussionboardMembersArticlesController";
import { DiscussionboardMemberMembersSessionsController } from "./controllers/discussionBoard/member/members/sessions/DiscussionboardMemberMembersSessionsController";
import { DiscussionboardMemberMySessionsController } from "./controllers/discussionBoard/member/my/sessions/DiscussionboardMemberMySessionsController";
import { DiscussionboardModeratorMembersSessionsController } from "./controllers/discussionBoard/moderator/members/sessions/DiscussionboardModeratorMembersSessionsController";
import { DiscussionboardModeratorModeratorsController } from "./controllers/discussionBoard/moderator/moderators/DiscussionboardModeratorModeratorsController";
import { DiscussionboardModeratorModeratorsSessionsController } from "./controllers/discussionBoard/moderator/moderators/sessions/DiscussionboardModeratorModeratorsSessionsController";
import { DiscussionboardModeratorModeratorsModerationlogsController } from "./controllers/discussionBoard/moderator/moderators/moderationLogs/DiscussionboardModeratorModeratorsModerationlogsController";
import { DiscussionboardModeratorGuestsController } from "./controllers/discussionBoard/moderator/guests/DiscussionboardModeratorGuestsController";
import { DiscussionboardModeratorEmailverificationsController } from "./controllers/discussionBoard/moderator/emailVerifications/DiscussionboardModeratorEmailverificationsController";
import { DiscussionboardEmailverificationsController } from "./controllers/discussionBoard/emailVerifications/DiscussionboardEmailverificationsController";
import { DiscussionboardPasswordresetsController } from "./controllers/discussionBoard/passwordResets/DiscussionboardPasswordresetsController";
import { DiscussionboardModeratorPasswordresetsController } from "./controllers/discussionBoard/moderator/passwordResets/DiscussionboardModeratorPasswordresetsController";
import { DiscussionboardModeratorAccountactionsController } from "./controllers/discussionBoard/moderator/accountActions/DiscussionboardModeratorAccountactionsController";
import { DiscussionboardModeratorMembersAccountactionsController } from "./controllers/discussionBoard/moderator/members/accountActions/DiscussionboardModeratorMembersAccountactionsController";
import { DiscussionboardModeratorModeratorsAccountactionsController } from "./controllers/discussionBoard/moderator/moderators/accountActions/DiscussionboardModeratorModeratorsAccountactionsController";
import { DiscussionboardArticlesController } from "./controllers/discussionBoard/articles/DiscussionboardArticlesController";
import { DiscussionboardMemberArticlesController } from "./controllers/discussionBoard/member/articles/DiscussionboardMemberArticlesController";
import { DiscussionboardModeratorArticlesController } from "./controllers/discussionBoard/moderator/articles/DiscussionboardModeratorArticlesController";
import { DiscussionboardCategoriesController } from "./controllers/discussionBoard/categories/DiscussionboardCategoriesController";
import { DiscussionboardModeratorCategoriesController } from "./controllers/discussionBoard/moderator/categories/DiscussionboardModeratorCategoriesController";
import { DiscussionboardArticlesAttachmentsController } from "./controllers/discussionBoard/articles/attachments/DiscussionboardArticlesAttachmentsController";
import { DiscussionboardMemberArticlesAttachmentsController } from "./controllers/discussionBoard/member/articles/attachments/DiscussionboardMemberArticlesAttachmentsController";
import { DiscussionboardModeratorArticlesAttachmentsController } from "./controllers/discussionBoard/moderator/articles/attachments/DiscussionboardModeratorArticlesAttachmentsController";
import { DiscussionboardModeratorContentreportsController } from "./controllers/discussionBoard/moderator/contentReports/DiscussionboardModeratorContentreportsController";
import { DiscussionboardMemberContentreportsController } from "./controllers/discussionBoard/member/contentReports/DiscussionboardMemberContentreportsController";
import { DiscussionboardModeratorArticlesReportsController } from "./controllers/discussionBoard/moderator/articles/reports/DiscussionboardModeratorArticlesReportsController";
import { DiscussionboardMemberArticlesReportsController } from "./controllers/discussionBoard/member/articles/reports/DiscussionboardMemberArticlesReportsController";
import { DiscussionboardModeratorMembersReportsController } from "./controllers/discussionBoard/moderator/members/reports/DiscussionboardModeratorMembersReportsController";
import { DiscussionboardModeratorModerationlogsController } from "./controllers/discussionBoard/moderator/moderationLogs/DiscussionboardModeratorModerationlogsController";
import { DiscussionboardModeratorArticlesModerationhistoryController } from "./controllers/discussionBoard/moderator/articles/moderationHistory/DiscussionboardModeratorArticlesModerationhistoryController";
import { DiscussionboardModeratorMembersModerationhistoryController } from "./controllers/discussionBoard/moderator/members/moderationHistory/DiscussionboardModeratorMembersModerationhistoryController";
import { DiscussionboardModeratorDashboardModerationOverviewController } from "./controllers/discussionBoard/moderator/dashboard/moderation/overview/DiscussionboardModeratorDashboardModerationOverviewController";
import { DiscussionboardModeratorDashboardModerationQueueController } from "./controllers/discussionBoard/moderator/dashboard/moderation/queue/DiscussionboardModeratorDashboardModerationQueueController";
import { DiscussionboardModeratorStatisticsModerationResponsetimeController } from "./controllers/discussionBoard/moderator/statistics/moderation/responseTime/DiscussionboardModeratorStatisticsModerationResponsetimeController";
import { DiscussionboardModeratorStatisticsModerationActionsbytypeController } from "./controllers/discussionBoard/moderator/statistics/moderation/actionsByType/DiscussionboardModeratorStatisticsModerationActionsbytypeController";

@Module({
  controllers: [
    AuthGuestController,
    AuthMemberController,
    AuthMemberEmailVerifyController,
    AuthMemberPasswordResetController,
    AuthMemberPasswordResetCompleteController,
    AuthMemberPasswordChangeController,
    AuthModeratorController,
    AuthModeratorPasswordResetRequestController,
    AuthModeratorPasswordResetConfirmController,
    AuthModeratorEmailVerifyRequestController,
    AuthModeratorEmailVerifyConfirmController,
    AuthModeratorPasswordChangeController,
    DiscussionboardModeratorMembersController,
    DiscussionboardMemberMembersController,
    DiscussionboardMembersArticlesController,
    DiscussionboardMemberMembersSessionsController,
    DiscussionboardMemberMySessionsController,
    DiscussionboardModeratorMembersSessionsController,
    DiscussionboardModeratorModeratorsController,
    DiscussionboardModeratorModeratorsSessionsController,
    DiscussionboardModeratorModeratorsModerationlogsController,
    DiscussionboardModeratorGuestsController,
    DiscussionboardModeratorEmailverificationsController,
    DiscussionboardEmailverificationsController,
    DiscussionboardPasswordresetsController,
    DiscussionboardModeratorPasswordresetsController,
    DiscussionboardModeratorAccountactionsController,
    DiscussionboardModeratorMembersAccountactionsController,
    DiscussionboardModeratorModeratorsAccountactionsController,
    DiscussionboardArticlesController,
    DiscussionboardMemberArticlesController,
    DiscussionboardModeratorArticlesController,
    DiscussionboardCategoriesController,
    DiscussionboardModeratorCategoriesController,
    DiscussionboardArticlesAttachmentsController,
    DiscussionboardMemberArticlesAttachmentsController,
    DiscussionboardModeratorArticlesAttachmentsController,
    DiscussionboardModeratorContentreportsController,
    DiscussionboardMemberContentreportsController,
    DiscussionboardModeratorArticlesReportsController,
    DiscussionboardMemberArticlesReportsController,
    DiscussionboardModeratorMembersReportsController,
    DiscussionboardModeratorModerationlogsController,
    DiscussionboardModeratorArticlesModerationhistoryController,
    DiscussionboardModeratorMembersModerationhistoryController,
    DiscussionboardModeratorDashboardModerationOverviewController,
    DiscussionboardModeratorDashboardModerationQueueController,
    DiscussionboardModeratorStatisticsModerationResponsetimeController,
    DiscussionboardModeratorStatisticsModerationActionsbytypeController,
  ],
})
export class MyModule {}
