import { Module } from "@nestjs/common";

import { AuthVisitorController } from "./controllers/auth/visitor/AuthVisitorController";
import { AuthCommunitymemberController } from "./controllers/auth/communityMember/AuthCommunitymemberController";
import { AuthCommunitymemberPasswordResetRequestController } from "./controllers/auth/communityMember/password/reset/request/AuthCommunitymemberPasswordResetRequestController";
import { AuthCommunitymemberPasswordResetController } from "./controllers/auth/communityMember/password/reset/AuthCommunitymemberPasswordResetController";
import { AuthCommunitymemberPasswordChangeController } from "./controllers/auth/communityMember/password/change/AuthCommunitymemberPasswordChangeController";
import { AuthCommunitymemberEmailVerifyController } from "./controllers/auth/communityMember/email/verify/AuthCommunitymemberEmailVerifyController";
import { AuthCommunitymemberTwofactorController } from "./controllers/auth/communityMember/twofactor/AuthCommunitymemberTwofactorController";
import { AuthCommunitymemberSessionsRevokeController } from "./controllers/auth/communityMember/sessions/revoke/AuthCommunitymemberSessionsRevokeController";
import { AuthSystemadminController } from "./controllers/auth/systemAdmin/AuthSystemadminController";
import { CommunitybbsCommunitiesController } from "./controllers/communityBbs/communities/CommunitybbsCommunitiesController";
import { CommunitybbsCommunitymemberCommunitiesController } from "./controllers/communityBbs/communityMember/communities/CommunitybbsCommunitymemberCommunitiesController";
import { CommunitybbsSystemadminCommunitiesController } from "./controllers/communityBbs/systemAdmin/communities/CommunitybbsSystemadminCommunitiesController";
import { CommunitybbsCommunitiesPostsController } from "./controllers/communityBbs/communities/posts/CommunitybbsCommunitiesPostsController";
import { CommunitybbsCommunitymemberCommunitiesPostsController } from "./controllers/communityBbs/communityMember/communities/posts/CommunitybbsCommunitymemberCommunitiesPostsController";
import { CommunitybbsCommunitymemberPostsController } from "./controllers/communityBbs/communityMember/posts/CommunitybbsCommunitymemberPostsController";
import { CommunitybbsSystemadminPostsController } from "./controllers/communityBbs/systemAdmin/posts/CommunitybbsSystemadminPostsController";
import { CommunitybbsPostsController } from "./controllers/communityBbs/posts/CommunitybbsPostsController";
import { CommunitybbsCommunitymemberPostsVotesController } from "./controllers/communityBbs/communityMember/posts/votes/CommunitybbsCommunitymemberPostsVotesController";
import { CommunitybbsCommunitymemberPostsReportController } from "./controllers/communityBbs/communityMember/posts/report/CommunitybbsCommunitymemberPostsReportController";
import { CommunitybbsCommunitymemberPostsCommentsController } from "./controllers/communityBbs/communityMember/posts/comments/CommunitybbsCommunitymemberPostsCommentsController";
import { CommunitybbsPostsCommentsController } from "./controllers/communityBbs/posts/comments/CommunitybbsPostsCommentsController";
import { CommunitybbsCommentsController } from "./controllers/communityBbs/comments/CommunitybbsCommentsController";
import { CommunitybbsCommunitymemberCommentsController } from "./controllers/communityBbs/communityMember/comments/CommunitybbsCommunitymemberCommentsController";
import { CommunitybbsCommunitymemberCommentsRepliesController } from "./controllers/communityBbs/communityMember/comments/replies/CommunitybbsCommunitymemberCommentsRepliesController";
import { CommunitybbsCommunitymemberCommentsVotesController } from "./controllers/communityBbs/communityMember/comments/votes/CommunitybbsCommunitymemberCommentsVotesController";
import { CommunitybbsCommunitymemberCommentsReportController } from "./controllers/communityBbs/communityMember/comments/report/CommunitybbsCommunitymemberCommentsReportController";
import { CommunitybbsCommunitymemberPostsHistoryController } from "./controllers/communityBbs/communityMember/posts/history/CommunitybbsCommunitymemberPostsHistoryController";
import { CommunitybbsCommunitymemberCommentsHistoryController } from "./controllers/communityBbs/communityMember/comments/history/CommunitybbsCommunitymemberCommentsHistoryController";
import { CommunitybbsCommunitymembersController } from "./controllers/communityBbs/communityMembers/CommunitybbsCommunitymembersController";
import { CommunitybbsCommunitymemberCommunitymembersController } from "./controllers/communityBbs/communityMember/communityMembers/CommunitybbsCommunitymemberCommunitymembersController";
import { CommunitybbsCommunitymemberCommunitymembersSessionsController } from "./controllers/communityBbs/communityMember/communityMembers/sessions/CommunitybbsCommunitymemberCommunitymembersSessionsController";
import { CommunitybbsCommunitymemberCommunitymembersPushtokensController } from "./controllers/communityBbs/communityMember/communityMembers/pushTokens/CommunitybbsCommunitymemberCommunitymembersPushtokensController";
import { CommunitybbsCommunitymemberCommunitymembersNotificationpreferencesController } from "./controllers/communityBbs/communityMember/communityMembers/notificationPreferences/CommunitybbsCommunitymemberCommunitymembersNotificationpreferencesController";
import { CommunitybbsCommunitymemberCommunitymembersSubscriptionsController } from "./controllers/communityBbs/communityMember/communityMembers/subscriptions/CommunitybbsCommunitymemberCommunitymembersSubscriptionsController";
import { CommunitybbsCommunitymembersProfileController } from "./controllers/communityBbs/communityMembers/profile/CommunitybbsCommunitymembersProfileController";
import { CommunitybbsCommunitymemberCommunitymembersProfileController } from "./controllers/communityBbs/communityMember/communityMembers/profile/CommunitybbsCommunitymemberCommunitymembersProfileController";
import { CommunitybbsSearchGlobalController } from "./controllers/communityBbs/search/global/CommunitybbsSearchGlobalController";
import { CommunitybbsReportsController } from "./controllers/communityBbs/reports/CommunitybbsReportsController";
import { CommunitybbsCommunitymemberReportsController } from "./controllers/communityBbs/communityMember/reports/CommunitybbsCommunitymemberReportsController";
import { CommunitybbsSystemadminReportsController } from "./controllers/communityBbs/systemAdmin/reports/CommunitybbsSystemadminReportsController";
import { CommunitybbsCommunitymemberModerationPostsActionsController } from "./controllers/communityBbs/communityMember/moderation/posts/actions/CommunitybbsCommunitymemberModerationPostsActionsController";
import { CommunitybbsSystemadminModerationPostsActionsController } from "./controllers/communityBbs/systemAdmin/moderation/posts/actions/CommunitybbsSystemadminModerationPostsActionsController";
import { CommunitybbsCommunitymemberModerationCommentsActionsController } from "./controllers/communityBbs/communityMember/moderation/comments/actions/CommunitybbsCommunitymemberModerationCommentsActionsController";
import { CommunitybbsSystemadminModerationCommentsActionsController } from "./controllers/communityBbs/systemAdmin/moderation/comments/actions/CommunitybbsSystemadminModerationCommentsActionsController";
import { CommunitybbsCommunitymemberModerationReportsController } from "./controllers/communityBbs/communityMember/moderation/reports/CommunitybbsCommunitymemberModerationReportsController";
import { CommunitybbsSystemadminModerationReportsController } from "./controllers/communityBbs/systemAdmin/moderation/reports/CommunitybbsSystemadminModerationReportsController";
import { CommunitybbsCommunitymemberCommunitiesSubscriptionsController } from "./controllers/communityBbs/communityMember/communities/subscriptions/CommunitybbsCommunitymemberCommunitiesSubscriptionsController";
import { CommunitybbsCommunitymemberNotificationsController } from "./controllers/communityBbs/communityMember/notifications/CommunitybbsCommunitymemberNotificationsController";
import { CommunitybbsSystemadminDashboardAdmin_overviewController } from "./controllers/communityBbs/systemAdmin/dashboard/admin-overview/CommunitybbsSystemadminDashboardAdmin_overviewController";
import { CommunitybbsCategoriesController } from "./controllers/communityBbs/categories/CommunitybbsCategoriesController";
import { CommunitybbsSystemadminCategoriesController } from "./controllers/communityBbs/systemAdmin/categories/CommunitybbsSystemadminCategoriesController";
import { CommunitybbsCommunitymemberUploadsController } from "./controllers/communityBbs/communityMember/uploads/CommunitybbsCommunitymemberUploadsController";
import { CommunitybbsSystemadminAuditLogsController } from "./controllers/communityBbs/systemAdmin/audit/logs/CommunitybbsSystemadminAuditLogsController";
import { CommunitybbsSystemadminVotesReconciliationController } from "./controllers/communityBbs/systemAdmin/votes/reconciliation/CommunitybbsSystemadminVotesReconciliationController";

@Module({
  controllers: [
    AuthVisitorController,
    AuthCommunitymemberController,
    AuthCommunitymemberPasswordResetRequestController,
    AuthCommunitymemberPasswordResetController,
    AuthCommunitymemberPasswordChangeController,
    AuthCommunitymemberEmailVerifyController,
    AuthCommunitymemberTwofactorController,
    AuthCommunitymemberSessionsRevokeController,
    AuthSystemadminController,
    CommunitybbsCommunitiesController,
    CommunitybbsCommunitymemberCommunitiesController,
    CommunitybbsSystemadminCommunitiesController,
    CommunitybbsCommunitiesPostsController,
    CommunitybbsCommunitymemberCommunitiesPostsController,
    CommunitybbsCommunitymemberPostsController,
    CommunitybbsSystemadminPostsController,
    CommunitybbsPostsController,
    CommunitybbsCommunitymemberPostsVotesController,
    CommunitybbsCommunitymemberPostsReportController,
    CommunitybbsCommunitymemberPostsCommentsController,
    CommunitybbsPostsCommentsController,
    CommunitybbsCommentsController,
    CommunitybbsCommunitymemberCommentsController,
    CommunitybbsCommunitymemberCommentsRepliesController,
    CommunitybbsCommunitymemberCommentsVotesController,
    CommunitybbsCommunitymemberCommentsReportController,
    CommunitybbsCommunitymemberPostsHistoryController,
    CommunitybbsCommunitymemberCommentsHistoryController,
    CommunitybbsCommunitymembersController,
    CommunitybbsCommunitymemberCommunitymembersController,
    CommunitybbsCommunitymemberCommunitymembersSessionsController,
    CommunitybbsCommunitymemberCommunitymembersPushtokensController,
    CommunitybbsCommunitymemberCommunitymembersNotificationpreferencesController,
    CommunitybbsCommunitymemberCommunitymembersSubscriptionsController,
    CommunitybbsCommunitymembersProfileController,
    CommunitybbsCommunitymemberCommunitymembersProfileController,
    CommunitybbsSearchGlobalController,
    CommunitybbsReportsController,
    CommunitybbsCommunitymemberReportsController,
    CommunitybbsSystemadminReportsController,
    CommunitybbsCommunitymemberModerationPostsActionsController,
    CommunitybbsSystemadminModerationPostsActionsController,
    CommunitybbsCommunitymemberModerationCommentsActionsController,
    CommunitybbsSystemadminModerationCommentsActionsController,
    CommunitybbsCommunitymemberModerationReportsController,
    CommunitybbsSystemadminModerationReportsController,
    CommunitybbsCommunitymemberCommunitiesSubscriptionsController,
    CommunitybbsCommunitymemberNotificationsController,
    CommunitybbsSystemadminDashboardAdmin_overviewController,
    CommunitybbsCategoriesController,
    CommunitybbsSystemadminCategoriesController,
    CommunitybbsCommunitymemberUploadsController,
    CommunitybbsSystemadminAuditLogsController,
    CommunitybbsSystemadminVotesReconciliationController,
  ],
})
export class MyModule {}
