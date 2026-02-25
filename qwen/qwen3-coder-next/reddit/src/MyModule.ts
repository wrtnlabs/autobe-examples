import { Module } from "@nestjs/common";

import { RedditcloneAppealsController } from "./controllers/redditClone/appeals/RedditcloneAppealsController";
import { RedditcloneAuthGuestController } from "./controllers/redditClone/auth/guest/RedditcloneAuthGuestController";
import { RedditcloneAuthMemberController } from "./controllers/redditClone/auth/member/RedditcloneAuthMemberController";
import { RedditcloneAuthModeratorController } from "./controllers/redditClone/auth/moderator/RedditcloneAuthModeratorController";
import { RedditcloneAuthOwnerController } from "./controllers/redditClone/auth/owner/RedditcloneAuthOwnerController";
import { RedditcloneBansController } from "./controllers/redditClone/bans/RedditcloneBansController";
import { RedditcloneCommentsVotesController } from "./controllers/redditClone/comments/votes/RedditcloneCommentsVotesController";
import { RedditcloneCommunitiesController } from "./controllers/redditClone/communities/RedditcloneCommunitiesController";
import { RedditcloneCommunitiesBansController } from "./controllers/redditClone/communities/bans/RedditcloneCommunitiesBansController";
import { RedditcloneCommunitiesModerator_assignmentsController } from "./controllers/redditClone/communities/moderator-assignments/RedditcloneCommunitiesModerator_assignmentsController";
import { RedditcloneCommunitiesModeratorsController } from "./controllers/redditClone/communities/moderators/RedditcloneCommunitiesModeratorsController";
import { RedditcloneCommunitiesPostsController } from "./controllers/redditClone/communities/posts/RedditcloneCommunitiesPostsController";
import { RedditcloneContent_typesController } from "./controllers/redditClone/content-types/RedditcloneContent_typesController";
import { RedditcloneFeed_configsController } from "./controllers/redditClone/feed-configs/RedditcloneFeed_configsController";
import { RedditcloneFeed_viewsController } from "./controllers/redditClone/feed-views/RedditcloneFeed_viewsController";
import { RedditcloneGuestAnalyticsCommunitiesStatisticsController } from "./controllers/redditClone/guest/analytics/communities/statistics/RedditcloneGuestAnalyticsCommunitiesStatisticsController";
import { RedditcloneGuestAnalyticsPostsControversialController } from "./controllers/redditClone/guest/analytics/posts/controversial/RedditcloneGuestAnalyticsPostsControversialController";
import { RedditcloneGuestAnalyticsPostsHotController } from "./controllers/redditClone/guest/analytics/posts/hot/RedditcloneGuestAnalyticsPostsHotController";
import { RedditcloneGuestAnalyticsPosts_newController } from "./controllers/redditClone/guest/analytics/posts/new/RedditcloneGuestAnalyticsPosts_newController";
import { RedditcloneGuestAnalyticsPostsTopController } from "./controllers/redditClone/guest/analytics/posts/top/RedditcloneGuestAnalyticsPostsTopController";
import { RedditcloneController } from "./controllers/redditClone/invalid/RedditcloneController";
import { RedditcloneKarmasController } from "./controllers/redditClone/karmas/RedditcloneKarmasController";
import { RedditcloneMemberAnalyticsCommunitiesStatisticsController } from "./controllers/redditClone/member/analytics/communities/statistics/RedditcloneMemberAnalyticsCommunitiesStatisticsController";
import { RedditcloneMemberAnalyticsKarmaTrendsController } from "./controllers/redditClone/member/analytics/karma/trends/RedditcloneMemberAnalyticsKarmaTrendsController";
import { RedditcloneMemberAnalyticsPostsControversialController } from "./controllers/redditClone/member/analytics/posts/controversial/RedditcloneMemberAnalyticsPostsControversialController";
import { RedditcloneMemberAnalyticsPostsHotController } from "./controllers/redditClone/member/analytics/posts/hot/RedditcloneMemberAnalyticsPostsHotController";
import { RedditcloneMemberAnalyticsPosts_newController } from "./controllers/redditClone/member/analytics/posts/new/RedditcloneMemberAnalyticsPosts_newController";
import { RedditcloneMemberAnalyticsPostsTopController } from "./controllers/redditClone/member/analytics/posts/top/RedditcloneMemberAnalyticsPostsTopController";
import { RedditcloneMemberCommentsController } from "./controllers/redditClone/member/comments/RedditcloneMemberCommentsController";
import { RedditcloneMemberCommentsRepliesController } from "./controllers/redditClone/member/comments/replies/RedditcloneMemberCommentsRepliesController";
import { RedditcloneMemberCommentsReportController } from "./controllers/redditClone/member/comments/report/RedditcloneMemberCommentsReportController";
import { RedditcloneMemberCommentsReportsController } from "./controllers/redditClone/member/comments/reports/RedditcloneMemberCommentsReportsController";
import { RedditcloneMemberCommunitiesSubscribeController } from "./controllers/redditClone/member/communities/subscribe/RedditcloneMemberCommunitiesSubscribeController";
import { RedditcloneMemberCommunitiesSubscribersController } from "./controllers/redditClone/member/communities/subscribers/RedditcloneMemberCommunitiesSubscribersController";
import { RedditcloneMemberFeed_preferencesController } from "./controllers/redditClone/member/feed-preferences/RedditcloneMemberFeed_preferencesController";
import { RedditcloneMemberPostsController } from "./controllers/redditClone/member/posts/RedditcloneMemberPostsController";
import { RedditcloneMemberPostsReportController } from "./controllers/redditClone/member/posts/report/RedditcloneMemberPostsReportController";
import { RedditcloneMemberPostsReportsController } from "./controllers/redditClone/member/posts/reports/RedditcloneMemberPostsReportsController";
import { RedditcloneMemberSubscriptionsController } from "./controllers/redditClone/member/subscriptions/RedditcloneMemberSubscriptionsController";
import { RedditcloneMemberUsersMeController } from "./controllers/redditClone/member/users/me/RedditcloneMemberUsersMeController";
import { RedditcloneMemberUsersMeChange_passwordController } from "./controllers/redditClone/member/users/me/change-password/RedditcloneMemberUsersMeChange_passwordController";
import { RedditcloneModeration_logsController } from "./controllers/redditClone/moderation-logs/RedditcloneModeration_logsController";
import { RedditcloneModeration_reportsController } from "./controllers/redditClone/moderation-reports/RedditcloneModeration_reportsController";
import { RedditcloneModerator_assignmentsController } from "./controllers/redditClone/moderator-assignments/RedditcloneModerator_assignmentsController";
import { RedditcloneModeratorAnalyticsBansController } from "./controllers/redditClone/moderator/analytics/bans/RedditcloneModeratorAnalyticsBansController";
import { RedditcloneModeratorAnalyticsModeratorDashboardController } from "./controllers/redditClone/moderator/analytics/moderator/dashboard/RedditcloneModeratorAnalyticsModeratorDashboardController";
import { RedditcloneModeratorAnalyticsPostsController } from "./controllers/redditClone/moderator/analytics/posts/trending/RedditcloneModeratorAnalyticsPostsController";
import { RedditcloneModeratorAnalyticsReportsResolutionController } from "./controllers/redditClone/moderator/analytics/reports/resolution/RedditcloneModeratorAnalyticsReportsResolutionController";
import { RedditcloneModeratorAnalyticsStatisticsController } from "./controllers/redditClone/moderator/analytics/statistics/RedditcloneModeratorAnalyticsStatisticsController";
import { RedditcloneModeratorAppealsQueueController } from "./controllers/redditClone/moderator/appeals/queue/RedditcloneModeratorAppealsQueueController";
import { RedditcloneModeratorCommunitiesAppealsController } from "./controllers/redditClone/moderator/communities/appeals/RedditcloneModeratorCommunitiesAppealsController";
import { RedditcloneModeratorCommunitiesBansController } from "./controllers/redditClone/moderator/communities/bans/RedditcloneModeratorCommunitiesBansController";
import { RedditcloneModeratorCommunitiesModeration_logsController } from "./controllers/redditClone/moderator/communities/moderation-logs/RedditcloneModeratorCommunitiesModeration_logsController";
import { RedditcloneModeratorCommunitiesReportsController } from "./controllers/redditClone/moderator/communities/reports/RedditcloneModeratorCommunitiesReportsController";
import { RedditcloneModeratorFeed_configsController } from "./controllers/redditClone/moderator/feed-configs/RedditcloneModeratorFeed_configsController";
import { RedditcloneModeratorFeed_viewsController } from "./controllers/redditClone/moderator/feed-views/RedditcloneModeratorFeed_viewsController";
import { RedditcloneModeratorReportsController } from "./controllers/redditClone/moderator/reports/RedditcloneModeratorReportsController";
import { RedditcloneModeratorReportsQueueController } from "./controllers/redditClone/moderator/reports/queue/RedditcloneModeratorReportsQueueController";
import { RedditcloneModeratorsLogsController } from "./controllers/redditClone/moderators/logs/RedditcloneModeratorsLogsController";
import { RedditcloneOwnerAnalyticsBansController } from "./controllers/redditClone/owner/analytics/bans/RedditcloneOwnerAnalyticsBansController";
import { RedditcloneOwnerAnalyticsModeratorDashboardController } from "./controllers/redditClone/owner/analytics/moderator/dashboard/RedditcloneOwnerAnalyticsModeratorDashboardController";
import { RedditcloneOwnerAnalyticsPostsController } from "./controllers/redditClone/owner/analytics/posts/trending/RedditcloneOwnerAnalyticsPostsController";
import { RedditcloneOwnerAnalyticsReportsResolutionController } from "./controllers/redditClone/owner/analytics/reports/resolution/RedditcloneOwnerAnalyticsReportsResolutionController";
import { RedditcloneOwnerAnalyticsResolution_ratesController } from "./controllers/redditClone/owner/analytics/resolution-rates/RedditcloneOwnerAnalyticsResolution_ratesController";
import { RedditcloneOwnerAnalyticsStatisticsController } from "./controllers/redditClone/owner/analytics/statistics/RedditcloneOwnerAnalyticsStatisticsController";
import { RedditcloneOwnerAudit_logsController } from "./controllers/redditClone/owner/audit-logs/RedditcloneOwnerAudit_logsController";
import { RedditcloneOwnerCommunitiesController } from "./controllers/redditClone/owner/communities/RedditcloneOwnerCommunitiesController";
import { RedditcloneOwnerCommunitiesAppealsController } from "./controllers/redditClone/owner/communities/appeals/RedditcloneOwnerCommunitiesAppealsController";
import { RedditcloneOwnerCommunitiesBansController } from "./controllers/redditClone/owner/communities/bans/RedditcloneOwnerCommunitiesBansController";
import { RedditcloneOwnerCommunitiesModeration_logsController } from "./controllers/redditClone/owner/communities/moderation-logs/RedditcloneOwnerCommunitiesModeration_logsController";
import { RedditcloneOwnerCommunitiesModeratorsController } from "./controllers/redditClone/owner/communities/moderators/RedditcloneOwnerCommunitiesModeratorsController";
import { RedditcloneOwnerCommunitiesReportsController } from "./controllers/redditClone/owner/communities/reports/RedditcloneOwnerCommunitiesReportsController";
import { RedditcloneOwnerCommunitiesSettingsController } from "./controllers/redditClone/owner/communities/settings/RedditcloneOwnerCommunitiesSettingsController";
import { RedditcloneOwnerFeed_configsController } from "./controllers/redditClone/owner/feed-configs/RedditcloneOwnerFeed_configsController";
import { RedditcloneOwnerFeed_viewsController } from "./controllers/redditClone/owner/feed-views/RedditcloneOwnerFeed_viewsController";
import { RedditclonePostsController } from "./controllers/redditClone/posts/RedditclonePostsController";
import { RedditclonePostsCommentsController } from "./controllers/redditClone/posts/comments/RedditclonePostsCommentsController";
import { RedditclonePostsPopularController } from "./controllers/redditClone/posts/popular/RedditclonePostsPopularController";
import { RedditclonePostsVotesController } from "./controllers/redditClone/posts/votes/RedditclonePostsVotesController";
import { RedditcloneUsersMeController } from "./controllers/redditClone/users/me/RedditcloneUsersMeController";

@Module({
  controllers: [
    RedditcloneAuthGuestController,
    RedditcloneAuthMemberController,
    RedditcloneAuthModeratorController,
    RedditcloneAuthOwnerController,
    RedditcloneUsersMeController,
    RedditcloneMemberUsersMeController,
    RedditcloneMemberUsersMeChange_passwordController,
    RedditcloneOwnerCommunitiesController,
    RedditcloneCommunitiesController,
    RedditcloneMemberCommunitiesSubscribersController,
    RedditcloneCommunitiesModeratorsController,
    RedditcloneOwnerCommunitiesModeratorsController,
    RedditcloneModeratorCommunitiesBansController,
    RedditcloneOwnerCommunitiesBansController,
    RedditcloneCommunitiesBansController,
    RedditclonePostsController,
    RedditcloneMemberPostsController,
    RedditclonePostsPopularController,
    RedditcloneCommunitiesPostsController,
    RedditcloneMemberCommentsController,
    RedditcloneMemberCommentsRepliesController,
    RedditclonePostsCommentsController,
    RedditcloneMemberCommunitiesSubscribeController,
    RedditcloneMemberSubscriptionsController,
    RedditcloneMemberPostsReportController,
    RedditcloneMemberCommentsReportController,
    RedditcloneModeratorCommunitiesReportsController,
    RedditcloneOwnerCommunitiesReportsController,
    RedditcloneKarmasController,
    RedditclonePostsVotesController,
    RedditcloneCommentsVotesController,
    RedditcloneFeed_configsController,
    RedditcloneModeratorFeed_configsController,
    RedditcloneOwnerFeed_configsController,
    RedditcloneMemberFeed_preferencesController,
    RedditcloneFeed_viewsController,
    RedditcloneModeratorFeed_viewsController,
    RedditcloneOwnerFeed_viewsController,
    RedditcloneCommunitiesModerator_assignmentsController,
    RedditcloneModerator_assignmentsController,
    RedditcloneBansController,
    RedditcloneModeratorsLogsController,
    RedditcloneModeration_logsController,
    RedditcloneAppealsController,
    RedditcloneModeration_reportsController,
    RedditcloneContent_typesController,
    RedditcloneController,
    RedditcloneMemberPostsReportsController,
    RedditcloneMemberCommentsReportsController,
    RedditcloneModeratorReportsController,
    RedditcloneModeratorCommunitiesAppealsController,
    RedditcloneOwnerCommunitiesAppealsController,
    RedditcloneOwnerCommunitiesSettingsController,
    RedditcloneModeratorCommunitiesModeration_logsController,
    RedditcloneOwnerCommunitiesModeration_logsController,
    RedditcloneGuestAnalyticsPostsHotController,
    RedditcloneMemberAnalyticsPostsHotController,
    RedditcloneGuestAnalyticsPostsControversialController,
    RedditcloneMemberAnalyticsPostsControversialController,
    RedditcloneGuestAnalyticsPosts_newController,
    RedditcloneMemberAnalyticsPosts_newController,
    RedditcloneMemberAnalyticsKarmaTrendsController,
    RedditcloneGuestAnalyticsPostsTopController,
    RedditcloneMemberAnalyticsPostsTopController,
    RedditcloneModeratorAnalyticsModeratorDashboardController,
    RedditcloneOwnerAnalyticsModeratorDashboardController,
    RedditcloneModeratorAnalyticsPostsController,
    RedditcloneOwnerAnalyticsPostsController,
    RedditcloneGuestAnalyticsCommunitiesStatisticsController,
    RedditcloneMemberAnalyticsCommunitiesStatisticsController,
    RedditcloneModeratorAnalyticsReportsResolutionController,
    RedditcloneOwnerAnalyticsReportsResolutionController,
    RedditcloneModeratorAnalyticsStatisticsController,
    RedditcloneOwnerAnalyticsStatisticsController,
    RedditcloneModeratorReportsQueueController,
    RedditcloneModeratorAppealsQueueController,
    RedditcloneOwnerAudit_logsController,
    RedditcloneModeratorAnalyticsBansController,
    RedditcloneOwnerAnalyticsBansController,
    RedditcloneOwnerAnalyticsResolution_ratesController,
  ],
})
export class MyModule {}
