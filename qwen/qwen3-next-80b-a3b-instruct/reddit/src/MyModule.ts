import { Module } from "@nestjs/common";

import { CommunitybbsAuthGuestController } from "./controllers/communityBbs/auth/guest/CommunitybbsAuthGuestController";
import { CommunitybbsAuthMemberController } from "./controllers/communityBbs/auth/member/CommunitybbsAuthMemberController";
import { CommunitybbsAuthModeratorController } from "./controllers/communityBbs/auth/moderator/CommunitybbsAuthModeratorController";
import { CommunitybbsAuthAdminController } from "./controllers/communityBbs/auth/admin/CommunitybbsAuthAdminController";
import { CommunitybbsAdminChannelsController } from "./controllers/communityBbs/admin/channels/CommunitybbsAdminChannelsController";
import { CommunitybbsAdminChannelsSectionsController } from "./controllers/communityBbs/admin/channels/sections/CommunitybbsAdminChannelsSectionsController";
import { CommunitybbsAdminConfigurationsController } from "./controllers/communityBbs/admin/configurations/CommunitybbsAdminConfigurationsController";
import { CommunitybbsMemberAuthMemberLogoutController } from "./controllers/communityBbs/member/auth/member/logout/CommunitybbsMemberAuthMemberLogoutController";
import { CommunitybbsMemberMembersController } from "./controllers/communityBbs/member/members/CommunitybbsMemberMembersController";
import { CommunitybbsModeratorAuthModeratorLogoutController } from "./controllers/communityBbs/moderator/auth/moderator/logout/CommunitybbsModeratorAuthModeratorLogoutController";
import { CommunitybbsModeratorModeratorsController } from "./controllers/communityBbs/moderator/moderators/CommunitybbsModeratorModeratorsController";
import { CommunitybbsAdminAuthAdminLogoutController } from "./controllers/communityBbs/admin/auth/admin/logout/CommunitybbsAdminAuthAdminLogoutController";
import { CommunitybbsAdminAdminsController } from "./controllers/communityBbs/admin/admins/CommunitybbsAdminAdminsController";
import { CommunitybbsMemberMember_sessionsController } from "./controllers/communityBbs/member/member_sessions/CommunitybbsMemberMember_sessionsController";
import { CommunitybbsModeratorModerator_sessionsController } from "./controllers/communityBbs/moderator/moderator_sessions/CommunitybbsModeratorModerator_sessionsController";
import { CommunitybbsAdminAdmin_sessionsController } from "./controllers/communityBbs/admin/admin_sessions/CommunitybbsAdminAdmin_sessionsController";
import { CommunitybbsMemberPostsController } from "./controllers/communityBbs/member/posts/CommunitybbsMemberPostsController";
import { CommunitybbsMemberPostsMediaController } from "./controllers/communityBbs/member/posts/media/CommunitybbsMemberPostsMediaController";
import { CommunitybbsAdminPost_statusesController } from "./controllers/communityBbs/admin/post-statuses/CommunitybbsAdminPost_statusesController";
import { CommunitybbsAdminCommunity_bannersController } from "./controllers/communityBbs/admin/community-banners/CommunitybbsAdminCommunity_bannersController";
import { CommunitybbsMemberCommentsController } from "./controllers/communityBbs/member/comments/CommunitybbsMemberCommentsController";
import { CommunitybbsModeratorCommentsController } from "./controllers/communityBbs/moderator/comments/CommunitybbsModeratorCommentsController";
import { CommunitybbsAdminCommentsController } from "./controllers/communityBbs/admin/comments/CommunitybbsAdminCommentsController";
import { CommunitybbsMemberCommentsRepliesController } from "./controllers/communityBbs/member/comments/replies/CommunitybbsMemberCommentsRepliesController";
import { CommunitybbsModeratorCommentsRepliesController } from "./controllers/communityBbs/moderator/comments/replies/CommunitybbsModeratorCommentsRepliesController";
import { CommunitybbsAdminCommentsRepliesController } from "./controllers/communityBbs/admin/comments/replies/CommunitybbsAdminCommentsRepliesController";
import { CommunitybbsMemberComment_editsController } from "./controllers/communityBbs/member/comment-edits/CommunitybbsMemberComment_editsController";
import { CommunitybbsModeratorComment_editsController } from "./controllers/communityBbs/moderator/comment-edits/CommunitybbsModeratorComment_editsController";
import { CommunitybbsAdminComment_editsController } from "./controllers/communityBbs/admin/comment-edits/CommunitybbsAdminComment_editsController";
import { CommunitybbsMemberComment_deletionsController } from "./controllers/communityBbs/member/comment-deletions/CommunitybbsMemberComment_deletionsController";
import { CommunitybbsModeratorComment_deletionsController } from "./controllers/communityBbs/moderator/comment-deletions/CommunitybbsModeratorComment_deletionsController";
import { CommunitybbsAdminComment_deletionsController } from "./controllers/communityBbs/admin/comment-deletions/CommunitybbsAdminComment_deletionsController";
import { CommunitybbsModeratorComment_report_statusesController } from "./controllers/communityBbs/moderator/comment-report-statuses/CommunitybbsModeratorComment_report_statusesController";
import { CommunitybbsAdminComment_report_statusesController } from "./controllers/communityBbs/admin/comment-report-statuses/CommunitybbsAdminComment_report_statusesController";
import { CommunitybbsModeratorComment_moderation_actionsController } from "./controllers/communityBbs/moderator/comment-moderation-actions/CommunitybbsModeratorComment_moderation_actionsController";
import { CommunitybbsAdminComment_moderation_actionsController } from "./controllers/communityBbs/admin/comment-moderation-actions/CommunitybbsAdminComment_moderation_actionsController";
import { CommunitybbsModeratorComment_reportsController } from "./controllers/communityBbs/moderator/comment-reports/CommunitybbsModeratorComment_reportsController";
import { CommunitybbsAdminComment_reportsController } from "./controllers/communityBbs/admin/comment-reports/CommunitybbsAdminComment_reportsController";
import { CommunitybbsMemberComment_votesController } from "./controllers/communityBbs/member/comment-votes/CommunitybbsMemberComment_votesController";
import { CommunitybbsModeratorComment_votesController } from "./controllers/communityBbs/moderator/comment-votes/CommunitybbsModeratorComment_votesController";
import { CommunitybbsAdminComment_votesController } from "./controllers/communityBbs/admin/comment-votes/CommunitybbsAdminComment_votesController";
import { CommunitybbsAdminKarma_scoresController } from "./controllers/communityBbs/admin/karma_scores/CommunitybbsAdminKarma_scoresController";
import { CommunitybbsAdminKarma_historyController } from "./controllers/communityBbs/admin/karma_history/CommunitybbsAdminKarma_historyController";
import { CommunitybbsAdminKarma_penaltiesController } from "./controllers/communityBbs/admin/karma_penalties/CommunitybbsAdminKarma_penaltiesController";
import { CommunitybbsMemberKarma_scoresController } from "./controllers/communityBbs/member/karma_scores/CommunitybbsMemberKarma_scoresController";
import { CommunitybbsModeratorKarma_scoresController } from "./controllers/communityBbs/moderator/karma_scores/CommunitybbsModeratorKarma_scoresController";
import { CommunitybbsModeratorKarma_historyController } from "./controllers/communityBbs/moderator/karma_history/CommunitybbsModeratorKarma_historyController";
import { CommunitybbsModeratorKarma_penaltiesController } from "./controllers/communityBbs/moderator/karma_penalties/CommunitybbsModeratorKarma_penaltiesController";
import { CommunitybbsAdminKarma_decay_settingsController } from "./controllers/communityBbs/admin/karma_decay_settings/CommunitybbsAdminKarma_decay_settingsController";
import { CommunitybbsMemberKarmaController } from "./controllers/communityBbs/member/karma/CommunitybbsMemberKarmaController";
import { CommunitybbsMemberKarmaHistoryController } from "./controllers/communityBbs/member/karma/history/CommunitybbsMemberKarmaHistoryController";
import { CommunitybbsAdminCommunitiesModeratorsController } from "./controllers/communityBbs/admin/communities/moderators/CommunitybbsAdminCommunitiesModeratorsController";
import { CommunitybbsMemberCommunitiesSubscriptionsController } from "./controllers/communityBbs/member/communities/subscriptions/CommunitybbsMemberCommunitiesSubscriptionsController";
import { CommunitybbsMemberPost_reportsController } from "./controllers/communityBbs/member/post-reports/CommunitybbsMemberPost_reportsController";
import { CommunitybbsAdminPost_reportsController } from "./controllers/communityBbs/admin/post-reports/CommunitybbsAdminPost_reportsController";
import { CommunitybbsMemberCommunitiesController } from "./controllers/communityBbs/member/communities/CommunitybbsMemberCommunitiesController";
import { CommunitybbsAdminCommunitiesController } from "./controllers/communityBbs/admin/communities/CommunitybbsAdminCommunitiesController";
import { CommunitybbsModeratorPost_reportsController } from "./controllers/communityBbs/moderator/post-reports/CommunitybbsModeratorPost_reportsController";
import { CommunitybbsMemberUsersActivationController } from "./controllers/communityBbs/member/users/activation/CommunitybbsMemberUsersActivationController";
import { CommunitybbsMemberUsersKarmaController } from "./controllers/communityBbs/member/users/karma/CommunitybbsMemberUsersKarmaController";
import { CommunitybbsAdminUsersKarmaController } from "./controllers/communityBbs/admin/users/karma/CommunitybbsAdminUsersKarmaController";
import { CommunitybbsModeratorUsersKarmaController } from "./controllers/communityBbs/moderator/users/karma/CommunitybbsModeratorUsersKarmaController";
import { CommunitybbsMemberUsersSubscriptionsController } from "./controllers/communityBbs/member/users/subscriptions/CommunitybbsMemberUsersSubscriptionsController";
import { CommunitybbsAdminUsersBansController } from "./controllers/communityBbs/admin/users/bans/CommunitybbsAdminUsersBansController";
import { CommunitybbsModeratorUsersBansController } from "./controllers/communityBbs/moderator/users/bans/CommunitybbsModeratorUsersBansController";
import { CommunitybbsMemberUsersBansController } from "./controllers/communityBbs/member/users/bans/CommunitybbsMemberUsersBansController";
import { CommunitybbsMemberUsersReportsController } from "./controllers/communityBbs/member/users/reports/CommunitybbsMemberUsersReportsController";
import { CommunitybbsAdminUsersReportsController } from "./controllers/communityBbs/admin/users/reports/CommunitybbsAdminUsersReportsController";
import { CommunitybbsModeratorUsersReportsController } from "./controllers/communityBbs/moderator/users/reports/CommunitybbsModeratorUsersReportsController";
import { CommunitybbsMemberUsersStatusController } from "./controllers/communityBbs/member/users/status/CommunitybbsMemberUsersStatusController";
import { CommunitybbsAdminUsersStatusController } from "./controllers/communityBbs/admin/users/status/CommunitybbsAdminUsersStatusController";
import { CommunitybbsModeratorUsersStatusController } from "./controllers/communityBbs/moderator/users/status/CommunitybbsModeratorUsersStatusController";
import { CommunitybbsAdminStatisticsActorsController } from "./controllers/communityBbs/admin/statistics/actors/CommunitybbsAdminStatisticsActorsController";
import { CommunitybbsAdminStatisticsSessionsController } from "./controllers/communityBbs/admin/statistics/sessions/CommunitybbsAdminStatisticsSessionsController";
import { CommunitybbsAdminStatisticsModerationController } from "./controllers/communityBbs/admin/statistics/moderation/CommunitybbsAdminStatisticsModerationController";
import { CommunitybbsPostsHotController } from "./controllers/communityBbs/posts/hot/CommunitybbsPostsHotController";
import { CommunitybbsPostsTrendingController } from "./controllers/communityBbs/posts/trending/CommunitybbsPostsTrendingController";
import { CommunitybbsSearchPostsController } from "./controllers/communityBbs/search/posts/CommunitybbsSearchPostsController";
import { CommunitybbsMemberAnalyticsPostsHotController } from "./controllers/communityBbs/member/analytics/posts/hot/CommunitybbsMemberAnalyticsPostsHotController";
import { CommunitybbsAdminAnalyticsPostsHotController } from "./controllers/communityBbs/admin/analytics/posts/hot/CommunitybbsAdminAnalyticsPostsHotController";
import { CommunitybbsMemberAnalyticsPostsTopController } from "./controllers/communityBbs/member/analytics/posts/top/CommunitybbsMemberAnalyticsPostsTopController";
import { CommunitybbsAdminAnalyticsPostsTopController } from "./controllers/communityBbs/admin/analytics/posts/top/CommunitybbsAdminAnalyticsPostsTopController";
import { CommunitybbsMemberAnalyticsPostsControversialController } from "./controllers/communityBbs/member/analytics/posts/controversial/CommunitybbsMemberAnalyticsPostsControversialController";
import { CommunitybbsAdminAnalyticsPostsControversialController } from "./controllers/communityBbs/admin/analytics/posts/controversial/CommunitybbsAdminAnalyticsPostsControversialController";
import { CommunitybbsMemberAnalyticsPostsTrendingController } from "./controllers/communityBbs/member/analytics/posts/trending/CommunitybbsMemberAnalyticsPostsTrendingController";
import { CommunitybbsAdminAnalyticsPostsTrendingController } from "./controllers/communityBbs/admin/analytics/posts/trending/CommunitybbsAdminAnalyticsPostsTrendingController";
import { CommunitybbsAnalyticsCommunitiesTrendingController } from "./controllers/communityBbs/analytics/communities/trending/CommunitybbsAnalyticsCommunitiesTrendingController";
import { CommunitybbsMemberRecommendationsCommunitiesController } from "./controllers/communityBbs/member/recommendations/communities/CommunitybbsMemberRecommendationsCommunitiesController";
import { CommunitybbsAdminModerationCommunitiesApproval_requestsController } from "./controllers/communityBbs/admin/moderation/communities/approval-requests/CommunitybbsAdminModerationCommunitiesApproval_requestsController";
import { CommunitybbsAdminFeaturesCommunitiesController } from "./controllers/communityBbs/admin/features/communities/CommunitybbsAdminFeaturesCommunitiesController";
import { CommunitybbsAdminAnalyticsCommunitiesMetricsController } from "./controllers/communityBbs/admin/analytics/communities/metrics/CommunitybbsAdminAnalyticsCommunitiesMetricsController";
import { CommunitybbsSearchCommunitiesController } from "./controllers/communityBbs/search/communities/CommunitybbsSearchCommunitiesController";
import { CommunitybbsContentHotController } from "./controllers/communityBbs/content/hot/CommunitybbsContentHotController";
import { CommunitybbsContentTopController } from "./controllers/communityBbs/content/top/CommunitybbsContentTopController";
import { CommunitybbsContentControversialController } from "./controllers/communityBbs/content/controversial/CommunitybbsContentControversialController";
import { CommunitybbsContentRecommendationsController } from "./controllers/communityBbs/content/recommendations/CommunitybbsContentRecommendationsController";
import { CommunitybbsContentTrendingController } from "./controllers/communityBbs/content/trending/CommunitybbsContentTrendingController";
import { CommunitybbsMemberUsersReputationController } from "./controllers/communityBbs/member/users/reputation/CommunitybbsMemberUsersReputationController";
import { CommunitybbsAdminUsersModeration_summaryController } from "./controllers/communityBbs/admin/users/moderation-summary/CommunitybbsAdminUsersModeration_summaryController";
import { CommunitybbsAdminAnalyticsUsersKarmaController } from "./controllers/communityBbs/admin/analytics/users/karma/CommunitybbsAdminAnalyticsUsersKarmaController";
import { CommunitybbsAdminUsersActivation_historyController } from "./controllers/communityBbs/admin/users/activation-history/CommunitybbsAdminUsersActivation_historyController";
import { CommunitybbsMemberUsersStatus_overviewController } from "./controllers/communityBbs/member/users/status-overview/CommunitybbsMemberUsersStatus_overviewController";
import { CommunitybbsAdminUsersStatus_overviewController } from "./controllers/communityBbs/admin/users/status-overview/CommunitybbsAdminUsersStatus_overviewController";

@Module({
  controllers: [
    CommunitybbsAuthGuestController,
    CommunitybbsAuthMemberController,
    CommunitybbsAuthModeratorController,
    CommunitybbsAuthAdminController,
    CommunitybbsAdminChannelsController,
    CommunitybbsAdminChannelsSectionsController,
    CommunitybbsAdminConfigurationsController,
    CommunitybbsMemberAuthMemberLogoutController,
    CommunitybbsMemberMembersController,
    CommunitybbsModeratorAuthModeratorLogoutController,
    CommunitybbsModeratorModeratorsController,
    CommunitybbsAdminAuthAdminLogoutController,
    CommunitybbsAdminAdminsController,
    CommunitybbsMemberMember_sessionsController,
    CommunitybbsModeratorModerator_sessionsController,
    CommunitybbsAdminAdmin_sessionsController,
    CommunitybbsMemberPostsController,
    CommunitybbsMemberPostsMediaController,
    CommunitybbsAdminPost_statusesController,
    CommunitybbsAdminCommunity_bannersController,
    CommunitybbsMemberCommentsController,
    CommunitybbsModeratorCommentsController,
    CommunitybbsAdminCommentsController,
    CommunitybbsMemberCommentsRepliesController,
    CommunitybbsModeratorCommentsRepliesController,
    CommunitybbsAdminCommentsRepliesController,
    CommunitybbsMemberComment_editsController,
    CommunitybbsModeratorComment_editsController,
    CommunitybbsAdminComment_editsController,
    CommunitybbsMemberComment_deletionsController,
    CommunitybbsModeratorComment_deletionsController,
    CommunitybbsAdminComment_deletionsController,
    CommunitybbsModeratorComment_report_statusesController,
    CommunitybbsAdminComment_report_statusesController,
    CommunitybbsModeratorComment_moderation_actionsController,
    CommunitybbsAdminComment_moderation_actionsController,
    CommunitybbsModeratorComment_reportsController,
    CommunitybbsAdminComment_reportsController,
    CommunitybbsMemberComment_votesController,
    CommunitybbsModeratorComment_votesController,
    CommunitybbsAdminComment_votesController,
    CommunitybbsAdminKarma_scoresController,
    CommunitybbsAdminKarma_historyController,
    CommunitybbsAdminKarma_penaltiesController,
    CommunitybbsMemberKarma_scoresController,
    CommunitybbsModeratorKarma_scoresController,
    CommunitybbsModeratorKarma_historyController,
    CommunitybbsModeratorKarma_penaltiesController,
    CommunitybbsAdminKarma_decay_settingsController,
    CommunitybbsMemberKarmaController,
    CommunitybbsMemberKarmaHistoryController,
    CommunitybbsAdminCommunitiesModeratorsController,
    CommunitybbsMemberCommunitiesSubscriptionsController,
    CommunitybbsMemberPost_reportsController,
    CommunitybbsAdminPost_reportsController,
    CommunitybbsMemberCommunitiesController,
    CommunitybbsAdminCommunitiesController,
    CommunitybbsModeratorPost_reportsController,
    CommunitybbsMemberUsersActivationController,
    CommunitybbsMemberUsersKarmaController,
    CommunitybbsAdminUsersKarmaController,
    CommunitybbsModeratorUsersKarmaController,
    CommunitybbsMemberUsersSubscriptionsController,
    CommunitybbsAdminUsersBansController,
    CommunitybbsModeratorUsersBansController,
    CommunitybbsMemberUsersBansController,
    CommunitybbsMemberUsersReportsController,
    CommunitybbsAdminUsersReportsController,
    CommunitybbsModeratorUsersReportsController,
    CommunitybbsMemberUsersStatusController,
    CommunitybbsAdminUsersStatusController,
    CommunitybbsModeratorUsersStatusController,
    CommunitybbsAdminStatisticsActorsController,
    CommunitybbsAdminStatisticsSessionsController,
    CommunitybbsAdminStatisticsModerationController,
    CommunitybbsPostsHotController,
    CommunitybbsPostsTrendingController,
    CommunitybbsSearchPostsController,
    CommunitybbsMemberAnalyticsPostsHotController,
    CommunitybbsAdminAnalyticsPostsHotController,
    CommunitybbsMemberAnalyticsPostsTopController,
    CommunitybbsAdminAnalyticsPostsTopController,
    CommunitybbsMemberAnalyticsPostsControversialController,
    CommunitybbsAdminAnalyticsPostsControversialController,
    CommunitybbsMemberAnalyticsPostsTrendingController,
    CommunitybbsAdminAnalyticsPostsTrendingController,
    CommunitybbsAnalyticsCommunitiesTrendingController,
    CommunitybbsMemberRecommendationsCommunitiesController,
    CommunitybbsAdminModerationCommunitiesApproval_requestsController,
    CommunitybbsAdminFeaturesCommunitiesController,
    CommunitybbsAdminAnalyticsCommunitiesMetricsController,
    CommunitybbsSearchCommunitiesController,
    CommunitybbsContentHotController,
    CommunitybbsContentTopController,
    CommunitybbsContentControversialController,
    CommunitybbsContentRecommendationsController,
    CommunitybbsContentTrendingController,
    CommunitybbsMemberUsersReputationController,
    CommunitybbsAdminUsersModeration_summaryController,
    CommunitybbsAdminAnalyticsUsersKarmaController,
    CommunitybbsAdminUsersActivation_historyController,
    CommunitybbsMemberUsersStatus_overviewController,
    CommunitybbsAdminUsersStatus_overviewController,
  ],
})
export class MyModule {}
