import { Module } from "@nestjs/common";

import { CommunityplatformAdminBan_reasonsController } from "./controllers/communityPlatform/admin/ban-reasons/CommunityplatformAdminBan_reasonsController";
import { CommunityplatformAdminBansController } from "./controllers/communityPlatform/admin/bans/CommunityplatformAdminBansController";
import { CommunityplatformAdminBansAssignmentsController } from "./controllers/communityPlatform/admin/bans/assignments/CommunityplatformAdminBansAssignmentsController";
import { CommunityplatformAdminBansSnapshotsController } from "./controllers/communityPlatform/admin/bans/snapshots/CommunityplatformAdminBansSnapshotsController";
import { CommunityplatformAdminCommentsVotesSnapshotsController } from "./controllers/communityPlatform/admin/comments/votes/snapshots/CommunityplatformAdminCommentsVotesSnapshotsController";
import { CommunityplatformAdminCommunitiesSnapshotsController } from "./controllers/communityPlatform/admin/communities/snapshots/CommunityplatformAdminCommunitiesSnapshotsController";
import { CommunityplatformAdminCommunitiesSubscribersController } from "./controllers/communityPlatform/admin/communities/subscribers/metrics/CommunityplatformAdminCommunitiesSubscribersController";
import { CommunityplatformAdminDashboardController } from "./controllers/communityPlatform/admin/dashboard/CommunityplatformAdminDashboardController";
import { CommunityplatformAdminFilesOrphansController } from "./controllers/communityPlatform/admin/files/orphans/CommunityplatformAdminFilesOrphansController";
import { CommunityplatformAdminFilesController } from "./controllers/communityPlatform/admin/files/upload/CommunityplatformAdminFilesController";
import { CommunityplatformAdminKarmasController } from "./controllers/communityPlatform/admin/karmas/CommunityplatformAdminKarmasController";
import { CommunityplatformAdminMembersCommentsVoteController } from "./controllers/communityPlatform/admin/members/comments/vote/CommunityplatformAdminMembersCommentsVoteController";
import { CommunityplatformAdminMembersPostsVoteController } from "./controllers/communityPlatform/admin/members/posts/vote/CommunityplatformAdminMembersPostsVoteController";
import { CommunityplatformAdminMembersProfileController } from "./controllers/communityPlatform/admin/members/profile/CommunityplatformAdminMembersProfileController";
import { CommunityplatformAdminMetricsController } from "./controllers/communityPlatform/admin/metrics/CommunityplatformAdminMetricsController";
import { CommunityplatformAdminModeration_rolesController } from "./controllers/communityPlatform/admin/moderation-roles/CommunityplatformAdminModeration_rolesController";
import { CommunityplatformAdminPostsView_statsController } from "./controllers/communityPlatform/admin/posts/view-stats/CommunityplatformAdminPostsView_statsController";
import { CommunityplatformAdminPostsVotesSnapshotsController } from "./controllers/communityPlatform/admin/posts/votes/snapshots/CommunityplatformAdminPostsVotesSnapshotsController";
import { CommunityplatformAdminReportsApprovalsController } from "./controllers/communityPlatform/admin/reports/approvals/CommunityplatformAdminReportsApprovalsController";
import { CommunityplatformAdminReportsDismissalsController } from "./controllers/communityPlatform/admin/reports/dismissals/CommunityplatformAdminReportsDismissalsController";
import { CommunityplatformAdminReportsDismissedController } from "./controllers/communityPlatform/admin/reports/dismissed/CommunityplatformAdminReportsDismissedController";
import { CommunityplatformAdminReportsGroupedController } from "./controllers/communityPlatform/admin/reports/grouped/CommunityplatformAdminReportsGroupedController";
import { CommunityplatformAdminReportsHistoryController } from "./controllers/communityPlatform/admin/reports/history/CommunityplatformAdminReportsHistoryController";
import { CommunityplatformAdminReportsPriorityController } from "./controllers/communityPlatform/admin/reports/priority/CommunityplatformAdminReportsPriorityController";
import { CommunityplatformAdminReportsStatisticsController } from "./controllers/communityPlatform/admin/reports/statistics/CommunityplatformAdminReportsStatisticsController";
import { CommunityplatformAdminSessionsController } from "./controllers/communityPlatform/admin/sessions/CommunityplatformAdminSessionsController";
import { CommunityplatformAdminSnapshotsController } from "./controllers/communityPlatform/admin/snapshots/CommunityplatformAdminSnapshotsController";
import { CommunityplatformAdminSubscription_activitiesController } from "./controllers/communityPlatform/admin/subscription-activities/CommunityplatformAdminSubscription_activitiesController";
import { CommunityplatformAdminSubscription_snapshotsController } from "./controllers/communityPlatform/admin/subscription-snapshots/CommunityplatformAdminSubscription_snapshotsController";
import { CommunityplatformAdminSubscriptionsController } from "./controllers/communityPlatform/admin/subscriptions/CommunityplatformAdminSubscriptionsController";
import { CommunityplatformAdminSubscriptionsMetricsController } from "./controllers/communityPlatform/admin/subscriptions/metrics/CommunityplatformAdminSubscriptionsMetricsController";
import { CommunityplatformAdminsController } from "./controllers/communityPlatform/admins/CommunityplatformAdminsController";
import { CommunityplatformAuthAdminController } from "./controllers/communityPlatform/auth/admin/CommunityplatformAuthAdminController";
import { CommunityplatformAuthGuestController } from "./controllers/communityPlatform/auth/guest/CommunityplatformAuthGuestController";
import { CommunityplatformAuthMemberController } from "./controllers/communityPlatform/auth/member/CommunityplatformAuthMemberController";
import { CommunityplatformBan_reasonsController } from "./controllers/communityPlatform/ban-reasons/CommunityplatformBan_reasonsController";
import { CommunityplatformComment_snapshotsController } from "./controllers/communityPlatform/comment-snapshots/CommunityplatformComment_snapshotsController";
import { CommunityplatformCommentsController } from "./controllers/communityPlatform/comments/statistics/CommunityplatformCommentsController";
import { CommunityplatformCommunitiesController } from "./controllers/communityPlatform/communities/CommunityplatformCommunitiesController";
import { CommunityplatformCommunitiesFeedsController } from "./controllers/communityPlatform/communities/feeds/CommunityplatformCommunitiesFeedsController";
import { CommunityplatformCommunitiesSubscribersCountController } from "./controllers/communityPlatform/communities/subscribers/count/CommunityplatformCommunitiesSubscribersCountController";
import { CommunityplatformFilesController } from "./controllers/communityPlatform/files/CommunityplatformFilesController";
import { CommunityplatformFilesProcessesController } from "./controllers/communityPlatform/files/processes/CommunityplatformFilesProcessesController";
import { CommunityplatformFilesProcessesStepsController } from "./controllers/communityPlatform/files/processes/steps/CommunityplatformFilesProcessesStepsController";
import { CommunityplatformGuestKarmasController } from "./controllers/communityPlatform/guest/karmas/CommunityplatformGuestKarmasController";
import { CommunityplatformGuestsController } from "./controllers/communityPlatform/guests/CommunityplatformGuestsController";
import { CommunityplatformImagesController } from "./controllers/communityPlatform/images/CommunityplatformImagesController";
import { CommunityplatformMemberController } from "./controllers/communityPlatform/member/CommunityplatformMemberController";
import { CommunityplatformMemberBansController } from "./controllers/communityPlatform/member/bans/CommunityplatformMemberBansController";
import { CommunityplatformMemberBansAssignmentsController } from "./controllers/communityPlatform/member/bans/assignments/CommunityplatformMemberBansAssignmentsController";
import { CommunityplatformMemberCommentsVotesController } from "./controllers/communityPlatform/member/comments/votes/CommunityplatformMemberCommentsVotesController";
import { CommunityplatformMemberCommentsVotesMineController } from "./controllers/communityPlatform/member/comments/votes/mine/CommunityplatformMemberCommentsVotesMineController";
import { CommunityplatformMemberCommentsVotesSnapshotsController } from "./controllers/communityPlatform/member/comments/votes/snapshots/CommunityplatformMemberCommentsVotesSnapshotsController";
import { CommunityplatformMemberCommunitiesController } from "./controllers/communityPlatform/member/communities/CommunityplatformMemberCommunitiesController";
import { CommunityplatformMemberCommunitiesImagesController } from "./controllers/communityPlatform/member/communities/images/CommunityplatformMemberCommunitiesImagesController";
import { CommunityplatformMemberCommunitiesModeration_rolesController } from "./controllers/communityPlatform/member/communities/moderation-roles/CommunityplatformMemberCommunitiesModeration_rolesController";
import { CommunityplatformMemberDashboardController } from "./controllers/communityPlatform/member/dashboard/CommunityplatformMemberDashboardController";
import { CommunityplatformMemberFilesController } from "./controllers/communityPlatform/member/files/upload/CommunityplatformMemberFilesController";
import { CommunityplatformMemberHome_feedController } from "./controllers/communityPlatform/member/home-feed/CommunityplatformMemberHome_feedController";
import { CommunityplatformMemberImagesController } from "./controllers/communityPlatform/member/images/CommunityplatformMemberImagesController";
import { CommunityplatformMemberKarmaController } from "./controllers/communityPlatform/member/karma/CommunityplatformMemberKarmaController";
import { CommunityplatformMemberKarmasController } from "./controllers/communityPlatform/member/karmas/CommunityplatformMemberKarmasController";
import { CommunityplatformMemberModeration_rolesController } from "./controllers/communityPlatform/member/moderation-roles/CommunityplatformMemberModeration_rolesController";
import { CommunityplatformMemberModeratorsReportsController } from "./controllers/communityPlatform/member/moderators/reports/dashboard/CommunityplatformMemberModeratorsReportsController";
import { CommunityplatformMemberPost_votesMineController } from "./controllers/communityPlatform/member/post-votes/mine/CommunityplatformMemberPost_votesMineController";
import { CommunityplatformMemberPostsController } from "./controllers/communityPlatform/member/posts/CommunityplatformMemberPostsController";
import { CommunityplatformMemberPostsAttachmentsController } from "./controllers/communityPlatform/member/posts/attachments/CommunityplatformMemberPostsAttachmentsController";
import { CommunityplatformMemberPostsCommentsController } from "./controllers/communityPlatform/member/posts/comments/CommunityplatformMemberPostsCommentsController";
import { CommunityplatformMemberPostsLinkController } from "./controllers/communityPlatform/member/posts/link/CommunityplatformMemberPostsLinkController";
import { CommunityplatformMemberPostsLinksController } from "./controllers/communityPlatform/member/posts/links/CommunityplatformMemberPostsLinksController";
import { CommunityplatformMemberPostsTextsController } from "./controllers/communityPlatform/member/posts/texts/CommunityplatformMemberPostsTextsController";
import { CommunityplatformMemberPostsVotesController } from "./controllers/communityPlatform/member/posts/votes/CommunityplatformMemberPostsVotesController";
import { CommunityplatformMemberPostsVotesMineController } from "./controllers/communityPlatform/member/posts/votes/mine/CommunityplatformMemberPostsVotesMineController";
import { CommunityplatformMemberPostsVotesSnapshotsController } from "./controllers/communityPlatform/member/posts/votes/snapshots/CommunityplatformMemberPostsVotesSnapshotsController";
import { CommunityplatformMemberProfileController } from "./controllers/communityPlatform/member/profile/CommunityplatformMemberProfileController";
import { CommunityplatformMemberReportsController } from "./controllers/communityPlatform/member/reports/CommunityplatformMemberReportsController";
import { CommunityplatformMemberReportsDismissedController } from "./controllers/communityPlatform/member/reports/dismissed/CommunityplatformMemberReportsDismissedController";
import { CommunityplatformMemberReportsGroupedController } from "./controllers/communityPlatform/member/reports/grouped/CommunityplatformMemberReportsGroupedController";
import { CommunityplatformMemberReportsPriorityController } from "./controllers/communityPlatform/member/reports/priority/CommunityplatformMemberReportsPriorityController";
import { CommunityplatformMemberReportsStatisticsController } from "./controllers/communityPlatform/member/reports/statistics/CommunityplatformMemberReportsStatisticsController";
import { CommunityplatformMemberSessionsController } from "./controllers/communityPlatform/member/sessions/CommunityplatformMemberSessionsController";
import { CommunityplatformMemberSubscription_activitiesController } from "./controllers/communityPlatform/member/subscription-activities/CommunityplatformMemberSubscription_activitiesController";
import { CommunityplatformMemberSubscription_preferencesController } from "./controllers/communityPlatform/member/subscription-preferences/CommunityplatformMemberSubscription_preferencesController";
import { CommunityplatformMemberSubscription_snapshotsController } from "./controllers/communityPlatform/member/subscription-snapshots/CommunityplatformMemberSubscription_snapshotsController";
import { CommunityplatformMemberSubscriptionsController } from "./controllers/communityPlatform/member/subscriptions/CommunityplatformMemberSubscriptionsController";
import { CommunityplatformMemberTemp_uploadsController } from "./controllers/communityPlatform/member/temp-uploads/CommunityplatformMemberTemp_uploadsController";
import { CommunityplatformMembersController } from "./controllers/communityPlatform/members/CommunityplatformMembersController";
import { CommunityplatformPopular_feedController } from "./controllers/communityPlatform/popular-feed/CommunityplatformPopular_feedController";
import { CommunityplatformPost_snapshotsController } from "./controllers/communityPlatform/post-snapshots/CommunityplatformPost_snapshotsController";
import { CommunityplatformPostsController } from "./controllers/communityPlatform/posts/CommunityplatformPostsController";
import { CommunityplatformPostsAttachmentsController } from "./controllers/communityPlatform/posts/attachments/CommunityplatformPostsAttachmentsController";
import { CommunityplatformPostsCommentsController } from "./controllers/communityPlatform/posts/comments/CommunityplatformPostsCommentsController";
import { CommunityplatformPostsLinksController } from "./controllers/communityPlatform/posts/links/CommunityplatformPostsLinksController";
import { CommunityplatformPostsTextsController } from "./controllers/communityPlatform/posts/texts/CommunityplatformPostsTextsController";
import { CommunityplatformSearchController } from "./controllers/communityPlatform/search/unified/CommunityplatformSearchController";
import { CommunityplatformSubscriptionsController } from "./controllers/communityPlatform/subscriptions/CommunityplatformSubscriptionsController";

@Module({
  controllers: [
    CommunityplatformAuthGuestController,
    CommunityplatformAuthMemberController,
    CommunityplatformAuthAdminController,
    CommunityplatformMembersController,
    CommunityplatformMemberProfileController,
    CommunityplatformGuestsController,
    CommunityplatformAdminsController,
    CommunityplatformCommunitiesController,
    CommunityplatformMemberCommunitiesController,
    CommunityplatformMemberController,
    CommunityplatformImagesController,
    CommunityplatformMemberCommunitiesImagesController,
    CommunityplatformMemberImagesController,
    CommunityplatformMemberModeration_rolesController,
    CommunityplatformAdminModeration_rolesController,
    CommunityplatformMemberCommunitiesModeration_rolesController,
    CommunityplatformMemberBansController,
    CommunityplatformAdminBansController,
    CommunityplatformBan_reasonsController,
    CommunityplatformAdminBan_reasonsController,
    CommunityplatformMemberBansAssignmentsController,
    CommunityplatformAdminBansAssignmentsController,
    CommunityplatformAdminSnapshotsController,
    CommunityplatformAdminCommunitiesSnapshotsController,
    CommunityplatformAdminBansSnapshotsController,
    CommunityplatformPostsController,
    CommunityplatformMemberPostsController,
    CommunityplatformPostsAttachmentsController,
    CommunityplatformMemberPostsAttachmentsController,
    CommunityplatformPostsLinksController,
    CommunityplatformMemberPostsLinksController,
    CommunityplatformMemberPostsLinkController,
    CommunityplatformPostsTextsController,
    CommunityplatformMemberPostsTextsController,
    CommunityplatformAdminPostsView_statsController,
    CommunityplatformPost_snapshotsController,
    CommunityplatformPostsCommentsController,
    CommunityplatformMemberPostsCommentsController,
    CommunityplatformComment_snapshotsController,
    CommunityplatformSubscriptionsController,
    CommunityplatformMemberSubscriptionsController,
    CommunityplatformAdminSubscriptionsController,
    CommunityplatformMemberSubscription_activitiesController,
    CommunityplatformAdminSubscription_activitiesController,
    CommunityplatformMemberSubscription_preferencesController,
    CommunityplatformMemberSubscription_snapshotsController,
    CommunityplatformAdminSubscription_snapshotsController,
    CommunityplatformMemberPostsVotesController,
    CommunityplatformMemberPostsVotesSnapshotsController,
    CommunityplatformAdminPostsVotesSnapshotsController,
    CommunityplatformMemberCommentsVotesSnapshotsController,
    CommunityplatformAdminCommentsVotesSnapshotsController,
    CommunityplatformMemberKarmaController,
    CommunityplatformGuestKarmasController,
    CommunityplatformMemberKarmasController,
    CommunityplatformAdminKarmasController,
    CommunityplatformMemberCommentsVotesController,
    CommunityplatformMemberReportsController,
    CommunityplatformAdminReportsApprovalsController,
    CommunityplatformAdminReportsDismissalsController,
    CommunityplatformAdminReportsHistoryController,
    CommunityplatformFilesController,
    CommunityplatformFilesProcessesController,
    CommunityplatformMemberTemp_uploadsController,
    CommunityplatformFilesProcessesStepsController,
    CommunityplatformAdminMembersProfileController,
    CommunityplatformAdminDashboardController,
    CommunityplatformAdminMetricsController,
    CommunityplatformMemberSessionsController,
    CommunityplatformAdminSessionsController,
    CommunityplatformMemberHome_feedController,
    CommunityplatformPopular_feedController,
    CommunityplatformCommunitiesFeedsController,
    CommunityplatformSearchController,
    CommunityplatformCommentsController,
    CommunityplatformMemberModeratorsReportsController,
    CommunityplatformMemberDashboardController,
    CommunityplatformAdminCommunitiesSubscribersController,
    CommunityplatformAdminSubscriptionsMetricsController,
    CommunityplatformCommunitiesSubscribersCountController,
    CommunityplatformMemberPost_votesMineController,
    CommunityplatformMemberCommentsVotesMineController,
    CommunityplatformMemberPostsVotesMineController,
    CommunityplatformAdminMembersPostsVoteController,
    CommunityplatformAdminMembersCommentsVoteController,
    CommunityplatformMemberReportsStatisticsController,
    CommunityplatformAdminReportsStatisticsController,
    CommunityplatformMemberReportsDismissedController,
    CommunityplatformAdminReportsDismissedController,
    CommunityplatformMemberReportsGroupedController,
    CommunityplatformAdminReportsGroupedController,
    CommunityplatformMemberReportsPriorityController,
    CommunityplatformAdminReportsPriorityController,
    CommunityplatformMemberFilesController,
    CommunityplatformAdminFilesController,
    CommunityplatformAdminFilesOrphansController,
  ],
})
export class MyModule {}
