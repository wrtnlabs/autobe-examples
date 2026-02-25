import { Module } from "@nestjs/common";

import { CommunityplatformAdminActivitylogsController } from "./controllers/communityPlatform/admin/activityLogs/CommunityplatformAdminActivitylogsController";
import { CommunityplatformAdminBanned_usersController } from "./controllers/communityPlatform/admin/banned-users/CommunityplatformAdminBanned_usersController";
import { CommunityplatformAdminCommentsVotesSummaryController } from "./controllers/communityPlatform/admin/comments/votes/summary/CommunityplatformAdminCommentsVotesSummaryController";
import { CommunityplatformAdminCommunitiesController } from "./controllers/communityPlatform/admin/communities/CommunityplatformAdminCommunitiesController";
import { CommunityplatformAdminCommunitiesBanned_usersController } from "./controllers/communityPlatform/admin/communities/banned-users/CommunityplatformAdminCommunitiesBanned_usersController";
import { CommunityplatformAdminCommunitiesBanned_usersListController } from "./controllers/communityPlatform/admin/communities/banned-users/list/CommunityplatformAdminCommunitiesBanned_usersListController";
import { CommunityplatformAdminCommunitiesDeleted_contentsController } from "./controllers/communityPlatform/admin/communities/deleted-contents/CommunityplatformAdminCommunitiesDeleted_contentsController";
import { CommunityplatformAdminCommunitiesModeratorsController } from "./controllers/communityPlatform/admin/communities/moderators/CommunityplatformAdminCommunitiesModeratorsController";
import { CommunityplatformAdminCommunitiesPostsController } from "./controllers/communityPlatform/admin/communities/posts/CommunityplatformAdminCommunitiesPostsController";
import { CommunityplatformAdminCommunitiesReportsDecisionsController } from "./controllers/communityPlatform/admin/communities/reports/decisions/CommunityplatformAdminCommunitiesReportsDecisionsController";
import { CommunityplatformAdminDeleted_contentsController } from "./controllers/communityPlatform/admin/deleted-contents/CommunityplatformAdminDeleted_contentsController";
import { CommunityplatformAdminModeration_logsController } from "./controllers/communityPlatform/admin/moderation-logs/CommunityplatformAdminModeration_logsController";
import { CommunityplatformAdminPostsnapshotsController } from "./controllers/communityPlatform/admin/postSnapshots/CommunityplatformAdminPostsnapshotsController";
import { CommunityplatformAdminPostsController } from "./controllers/communityPlatform/admin/posts/CommunityplatformAdminPostsController";
import { CommunityplatformAdminPostsImagesController } from "./controllers/communityPlatform/admin/posts/images/CommunityplatformAdminPostsImagesController";
import { CommunityplatformAdminPostsLinkController } from "./controllers/communityPlatform/admin/posts/link/CommunityplatformAdminPostsLinkController";
import { CommunityplatformAdminPostsTextsController } from "./controllers/communityPlatform/admin/posts/texts/CommunityplatformAdminPostsTextsController";
import { CommunityplatformAdminPostsVotesController } from "./controllers/communityPlatform/admin/posts/votes/CommunityplatformAdminPostsVotesController";
import { CommunityplatformAdminPostsVotesSummaryController } from "./controllers/communityPlatform/admin/posts/votes/summary/CommunityplatformAdminPostsVotesSummaryController";
import { CommunityplatformAdminReportedcontentsController } from "./controllers/communityPlatform/admin/reportedContents/CommunityplatformAdminReportedcontentsController";
import { CommunityplatformAdminReports_decisionsController } from "./controllers/communityPlatform/admin/reports-decisions/CommunityplatformAdminReports_decisionsController";
import { CommunityplatformAdminReportsController } from "./controllers/communityPlatform/admin/reports/CommunityplatformAdminReportsController";
import { CommunityplatformAdminReportsApproveController } from "./controllers/communityPlatform/admin/reports/approve/CommunityplatformAdminReportsApproveController";
import { CommunityplatformAdminReportsReportedcontentsController } from "./controllers/communityPlatform/admin/reports/reportedContents/CommunityplatformAdminReportsReportedcontentsController";
import { CommunityplatformAdminsController } from "./controllers/communityPlatform/admins/CommunityplatformAdminsController";
import { CommunityplatformAuthAdminController } from "./controllers/communityPlatform/auth/admin/CommunityplatformAuthAdminController";
import { CommunityplatformAuthGuestController } from "./controllers/communityPlatform/auth/guest/CommunityplatformAuthGuestController";
import { CommunityplatformAuthModeratorController } from "./controllers/communityPlatform/auth/moderator/CommunityplatformAuthModeratorController";
import { CommunityplatformAuthUserController } from "./controllers/communityPlatform/auth/user/CommunityplatformAuthUserController";
import { CommunityplatformCommentsortordersController } from "./controllers/communityPlatform/commentSortOrders/CommunityplatformCommentsortordersController";
import { CommunityplatformCommentvotesController } from "./controllers/communityPlatform/commentVotes/CommunityplatformCommentvotesController";
import { CommunityplatformGuestCommunitiesController } from "./controllers/communityPlatform/guest/communities/CommunityplatformGuestCommunitiesController";
import { CommunityplatformGuestCommunitiesPostsController } from "./controllers/communityPlatform/guest/communities/posts/CommunityplatformGuestCommunitiesPostsController";
import { CommunityplatformGuestPostsController } from "./controllers/communityPlatform/guest/posts/CommunityplatformGuestPostsController";
import { CommunityplatformGuestPostsImagesController } from "./controllers/communityPlatform/guest/posts/images/CommunityplatformGuestPostsImagesController";
import { CommunityplatformGuestPostsLinkController } from "./controllers/communityPlatform/guest/posts/link/CommunityplatformGuestPostsLinkController";
import { CommunityplatformGuestPostsTextsController } from "./controllers/communityPlatform/guest/posts/texts/CommunityplatformGuestPostsTextsController";
import { CommunityplatformGuestProfileController } from "./controllers/communityPlatform/guest/profile/CommunityplatformGuestProfileController";
import { CommunityplatformGuestSessionsController } from "./controllers/communityPlatform/guest/sessions/CommunityplatformGuestSessionsController";
import { CommunityplatformGuestsController } from "./controllers/communityPlatform/guests/CommunityplatformGuestsController";
import { CommunityplatformModeratorBanned_usersController } from "./controllers/communityPlatform/moderator/banned-users/CommunityplatformModeratorBanned_usersController";
import { CommunityplatformModeratorCommentreportsController } from "./controllers/communityPlatform/moderator/commentReports/CommunityplatformModeratorCommentreportsController";
import { CommunityplatformModeratorCommentvotesModeratorsController } from "./controllers/communityPlatform/moderator/commentVotes/moderators/CommunityplatformModeratorCommentvotesModeratorsController";
import { CommunityplatformModeratorCommentsVotesSummaryController } from "./controllers/communityPlatform/moderator/comments/votes/summary/CommunityplatformModeratorCommentsVotesSummaryController";
import { CommunityplatformModeratorCommunitiesController } from "./controllers/communityPlatform/moderator/communities/CommunityplatformModeratorCommunitiesController";
import { CommunityplatformModeratorCommunitiesBanned_usersController } from "./controllers/communityPlatform/moderator/communities/banned-users/CommunityplatformModeratorCommunitiesBanned_usersController";
import { CommunityplatformModeratorCommunitiesBanned_usersListController } from "./controllers/communityPlatform/moderator/communities/banned-users/list/CommunityplatformModeratorCommunitiesBanned_usersListController";
import { CommunityplatformModeratorCommunitiesComments_deleteController } from "./controllers/communityPlatform/moderator/communities/comments/delete/CommunityplatformModeratorCommunitiesComments_deleteController";
import { CommunityplatformModeratorCommunitiesDeleted_contentsController } from "./controllers/communityPlatform/moderator/communities/deleted-contents/CommunityplatformModeratorCommunitiesDeleted_contentsController";
import { CommunityplatformModeratorCommunitiesModeratorsController } from "./controllers/communityPlatform/moderator/communities/moderators/CommunityplatformModeratorCommunitiesModeratorsController";
import { CommunityplatformModeratorCommunitiesPostsController } from "./controllers/communityPlatform/moderator/communities/posts/CommunityplatformModeratorCommunitiesPostsController";
import { CommunityplatformModeratorCommunitiesPosts_deleteController } from "./controllers/communityPlatform/moderator/communities/posts/delete/CommunityplatformModeratorCommunitiesPosts_deleteController";
import { CommunityplatformModeratorCommunitiesReportsDecisionsController } from "./controllers/communityPlatform/moderator/communities/reports/decisions/CommunityplatformModeratorCommunitiesReportsDecisionsController";
import { CommunityplatformModeratorDeleted_contentsController } from "./controllers/communityPlatform/moderator/deleted-contents/CommunityplatformModeratorDeleted_contentsController";
import { CommunityplatformModeratorModeration_logsController } from "./controllers/communityPlatform/moderator/moderation-logs/CommunityplatformModeratorModeration_logsController";
import { CommunityplatformModeratorModerationlogsController } from "./controllers/communityPlatform/moderator/moderationLogs/CommunityplatformModeratorModerationlogsController";
import { CommunityplatformModeratorPostvotesModeratorsController } from "./controllers/communityPlatform/moderator/postVotes/moderators/CommunityplatformModeratorPostvotesModeratorsController";
import { CommunityplatformModeratorPostsController } from "./controllers/communityPlatform/moderator/posts/CommunityplatformModeratorPostsController";
import { CommunityplatformModeratorPostsImagesController } from "./controllers/communityPlatform/moderator/posts/images/CommunityplatformModeratorPostsImagesController";
import { CommunityplatformModeratorPostsLinkController } from "./controllers/communityPlatform/moderator/posts/link/CommunityplatformModeratorPostsLinkController";
import { CommunityplatformModeratorPostsTextsController } from "./controllers/communityPlatform/moderator/posts/texts/CommunityplatformModeratorPostsTextsController";
import { CommunityplatformModeratorPostsVotesController } from "./controllers/communityPlatform/moderator/posts/votes/CommunityplatformModeratorPostsVotesController";
import { CommunityplatformModeratorPostsVotesSummaryController } from "./controllers/communityPlatform/moderator/posts/votes/summary/CommunityplatformModeratorPostsVotesSummaryController";
import { CommunityplatformModeratorReportedcontentsController } from "./controllers/communityPlatform/moderator/reportedContents/CommunityplatformModeratorReportedcontentsController";
import { CommunityplatformModeratorReports_decisionsController } from "./controllers/communityPlatform/moderator/reports-decisions/CommunityplatformModeratorReports_decisionsController";
import { CommunityplatformModeratorReportsController } from "./controllers/communityPlatform/moderator/reports/CommunityplatformModeratorReportsController";
import { CommunityplatformModeratorReportsApproveController } from "./controllers/communityPlatform/moderator/reports/approve/CommunityplatformModeratorReportsApproveController";
import { CommunityplatformModeratorReportsReportedcontentsController } from "./controllers/communityPlatform/moderator/reports/reportedContents/CommunityplatformModeratorReportsReportedcontentsController";
import { CommunityplatformModeratorsController } from "./controllers/communityPlatform/moderators/CommunityplatformModeratorsController";
import { CommunityplatformReportreasonsController } from "./controllers/communityPlatform/reportReasons/CommunityplatformReportreasonsController";
import { CommunityplatformUserCommentreportsController } from "./controllers/communityPlatform/user/commentReports/CommunityplatformUserCommentreportsController";
import { CommunityplatformUserCommentvotesUsersController } from "./controllers/communityPlatform/user/commentVotes/users/CommunityplatformUserCommentvotesUsersController";
import { CommunityplatformUserCommentsController } from "./controllers/communityPlatform/user/comments/CommunityplatformUserCommentsController";
import { CommunityplatformUserCommunitiesController } from "./controllers/communityPlatform/user/communities/CommunityplatformUserCommunitiesController";
import { CommunityplatformUserCommunitiesPostsController } from "./controllers/communityPlatform/user/communities/posts/CommunityplatformUserCommunitiesPostsController";
import { CommunityplatformUserEmail_verificationsController } from "./controllers/communityPlatform/user/email-verifications/CommunityplatformUserEmail_verificationsController";
import { CommunityplatformUserPassword_resetsController } from "./controllers/communityPlatform/user/password-resets/CommunityplatformUserPassword_resetsController";
import { CommunityplatformUserPostcommentsController } from "./controllers/communityPlatform/user/postComments/CommunityplatformUserPostcommentsController";
import { CommunityplatformUserPostvotesUsersController } from "./controllers/communityPlatform/user/postVotes/users/CommunityplatformUserPostvotesUsersController";
import { CommunityplatformUserPostsController } from "./controllers/communityPlatform/user/posts/CommunityplatformUserPostsController";
import { CommunityplatformUserPostsImagesController } from "./controllers/communityPlatform/user/posts/images/CommunityplatformUserPostsImagesController";
import { CommunityplatformUserPostsLinkController } from "./controllers/communityPlatform/user/posts/link/CommunityplatformUserPostsLinkController";
import { CommunityplatformUserPostsTextsController } from "./controllers/communityPlatform/user/posts/texts/CommunityplatformUserPostsTextsController";
import { CommunityplatformUserPostsVotesController } from "./controllers/communityPlatform/user/posts/votes/CommunityplatformUserPostsVotesController";
import { CommunityplatformUserReportsController } from "./controllers/communityPlatform/user/reports/CommunityplatformUserReportsController";
import { CommunityplatformUserReportsCommentsReportController } from "./controllers/communityPlatform/user/reports/comments/report/CommunityplatformUserReportsCommentsReportController";
import { CommunityplatformUserReportsPostsReportController } from "./controllers/communityPlatform/user/reports/posts/report/CommunityplatformUserReportsPostsReportController";
import { CommunityplatformUserSubscriptionsController } from "./controllers/communityPlatform/user/subscriptions/CommunityplatformUserSubscriptionsController";
import { CommunityplatformUsersController } from "./controllers/communityPlatform/users/CommunityplatformUsersController";

@Module({
  controllers: [
    CommunityplatformAuthGuestController,
    CommunityplatformAuthUserController,
    CommunityplatformAuthModeratorController,
    CommunityplatformAuthAdminController,
    CommunityplatformGuestSessionsController,
    CommunityplatformGuestsController,
    CommunityplatformGuestProfileController,
    CommunityplatformUsersController,
    CommunityplatformUserPassword_resetsController,
    CommunityplatformUserEmail_verificationsController,
    CommunityplatformModeratorsController,
    CommunityplatformAdminsController,
    CommunityplatformGuestCommunitiesController,
    CommunityplatformUserCommunitiesController,
    CommunityplatformModeratorCommunitiesController,
    CommunityplatformAdminCommunitiesController,
    CommunityplatformUserSubscriptionsController,
    CommunityplatformModeratorCommunitiesBanned_usersController,
    CommunityplatformAdminCommunitiesBanned_usersController,
    CommunityplatformModeratorCommunitiesModeratorsController,
    CommunityplatformAdminCommunitiesModeratorsController,
    CommunityplatformGuestCommunitiesPostsController,
    CommunityplatformUserCommunitiesPostsController,
    CommunityplatformModeratorCommunitiesPostsController,
    CommunityplatformAdminCommunitiesPostsController,
    CommunityplatformGuestPostsController,
    CommunityplatformUserPostsController,
    CommunityplatformModeratorPostsController,
    CommunityplatformAdminPostsController,
    CommunityplatformGuestPostsTextsController,
    CommunityplatformUserPostsTextsController,
    CommunityplatformModeratorPostsTextsController,
    CommunityplatformAdminPostsTextsController,
    CommunityplatformGuestPostsImagesController,
    CommunityplatformUserPostsImagesController,
    CommunityplatformModeratorPostsImagesController,
    CommunityplatformAdminPostsImagesController,
    CommunityplatformGuestPostsLinkController,
    CommunityplatformUserPostsLinkController,
    CommunityplatformModeratorPostsLinkController,
    CommunityplatformAdminPostsLinkController,
    CommunityplatformUserPostsVotesController,
    CommunityplatformModeratorPostsVotesController,
    CommunityplatformAdminPostsVotesController,
    CommunityplatformModeratorPostvotesModeratorsController,
    CommunityplatformUserPostvotesUsersController,
    CommunityplatformUserPostcommentsController,
    CommunityplatformUserCommentvotesUsersController,
    CommunityplatformModeratorCommentvotesModeratorsController,
    CommunityplatformCommentvotesController,
    CommunityplatformUserCommentsController,
    CommunityplatformUserCommentreportsController,
    CommunityplatformModeratorCommentreportsController,
    CommunityplatformCommentsortordersController,
    CommunityplatformModeratorModerationlogsController,
    CommunityplatformModeratorBanned_usersController,
    CommunityplatformAdminBanned_usersController,
    CommunityplatformModeratorDeleted_contentsController,
    CommunityplatformAdminDeleted_contentsController,
    CommunityplatformModeratorReports_decisionsController,
    CommunityplatformAdminReports_decisionsController,
    CommunityplatformReportreasonsController,
    CommunityplatformUserReportsController,
    CommunityplatformModeratorReportsController,
    CommunityplatformAdminReportsController,
    CommunityplatformModeratorReportsReportedcontentsController,
    CommunityplatformAdminReportsReportedcontentsController,
    CommunityplatformAdminActivitylogsController,
    CommunityplatformAdminPostsnapshotsController,
    CommunityplatformAdminReportedcontentsController,
    CommunityplatformModeratorReportedcontentsController,
    CommunityplatformModeratorReportsApproveController,
    CommunityplatformAdminReportsApproveController,
    CommunityplatformModeratorCommunitiesPosts_deleteController,
    CommunityplatformModeratorCommunitiesComments_deleteController,
    CommunityplatformModeratorModeration_logsController,
    CommunityplatformAdminModeration_logsController,
    CommunityplatformModeratorPostsVotesSummaryController,
    CommunityplatformAdminPostsVotesSummaryController,
    CommunityplatformModeratorCommentsVotesSummaryController,
    CommunityplatformAdminCommentsVotesSummaryController,
    CommunityplatformModeratorCommunitiesBanned_usersListController,
    CommunityplatformAdminCommunitiesBanned_usersListController,
    CommunityplatformModeratorCommunitiesDeleted_contentsController,
    CommunityplatformAdminCommunitiesDeleted_contentsController,
    CommunityplatformModeratorCommunitiesReportsDecisionsController,
    CommunityplatformAdminCommunitiesReportsDecisionsController,
    CommunityplatformUserReportsPostsReportController,
    CommunityplatformUserReportsCommentsReportController,
  ],
})
export class MyModule {}
