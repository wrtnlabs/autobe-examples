import { Module } from "@nestjs/common";

import { AuthUserController } from "./controllers/auth/user/AuthUserController";
import { UserProfileController } from "./controllers/user/profile/UserProfileController";
import { AuthCommunityadminController } from "./controllers/auth/communityAdmin/AuthCommunityadminController";
import { AuthSiteadminController } from "./controllers/auth/siteadmin/AuthSiteadminController";
import { RedditplatformChannelsController } from "./controllers/redditPlatform/channels/RedditplatformChannelsController";
import { RedditplatformCommunityadminChannelsController } from "./controllers/redditPlatform/communityAdmin/channels/RedditplatformCommunityadminChannelsController";
import { RedditplatformSiteadminChannelsController } from "./controllers/redditPlatform/siteAdmin/channels/RedditplatformSiteadminChannelsController";
import { RedditplatformCommunityadminChannelsSectionsController } from "./controllers/redditPlatform/communityAdmin/channels/sections/RedditplatformCommunityadminChannelsSectionsController";
import { RedditplatformSiteadminChannelsSectionsController } from "./controllers/redditPlatform/siteAdmin/channels/sections/RedditplatformSiteadminChannelsSectionsController";
import { RedditplatformUserChannelsSectionsController } from "./controllers/redditPlatform/user/channels/sections/RedditplatformUserChannelsSectionsController";
import { RedditplatformSiteadminConfigurationsController } from "./controllers/redditPlatform/siteAdmin/configurations/RedditplatformSiteadminConfigurationsController";
import { RedditplatformSiteadminLoginAttemptsController } from "./controllers/redditPlatform/siteAdmin/login/attempts/RedditplatformSiteadminLoginAttemptsController";
import { RedditplatformSiteadminTokensController } from "./controllers/redditPlatform/siteAdmin/tokens/RedditplatformSiteadminTokensController";
import { RedditplatformUserTokensController } from "./controllers/redditPlatform/user/tokens/RedditplatformUserTokensController";
import { RedditplatformTokensController } from "./controllers/redditPlatform/tokens/RedditplatformTokensController";
import { RedditplatformResetsController } from "./controllers/redditPlatform/resets/RedditplatformResetsController";
import { RedditplatformUserResetsController } from "./controllers/redditPlatform/user/resets/RedditplatformUserResetsController";
import { RedditplatformUserUsersSessionsController } from "./controllers/redditPlatform/user/users/sessions/RedditplatformUserUsersSessionsController";
import { RedditplatformSiteadminUsersSessionsController } from "./controllers/redditPlatform/siteAdmin/users/sessions/RedditplatformSiteadminUsersSessionsController";
import { RedditplatformCommunityadminCommunityadminsSessionsController } from "./controllers/redditPlatform/communityAdmin/communityadmins/sessions/RedditplatformCommunityadminCommunityadminsSessionsController";
import { RedditplatformSiteadminCommunityadminsSessionsController } from "./controllers/redditPlatform/siteAdmin/communityadmins/sessions/RedditplatformSiteadminCommunityadminsSessionsController";
import { RedditplatformSiteadminSiteadminsSessionsController } from "./controllers/redditPlatform/siteAdmin/siteadmins/sessions/RedditplatformSiteadminSiteadminsSessionsController";
import { RedditplatformUserCommunitiesController } from "./controllers/redditPlatform/user/communities/RedditplatformUserCommunitiesController";
import { RedditplatformCommunityadminCommunitiesController } from "./controllers/redditPlatform/communityAdmin/communities/RedditplatformCommunityadminCommunitiesController";
import { RedditplatformCommunityadminRulesController } from "./controllers/redditPlatform/communityAdmin/rules/RedditplatformCommunityadminRulesController";
import { RedditplatformRulesController } from "./controllers/redditPlatform/rules/RedditplatformRulesController";
import { RedditplatformUserSubscriptionsController } from "./controllers/redditPlatform/user/subscriptions/RedditplatformUserSubscriptionsController";
import { RedditplatformPostsController } from "./controllers/redditPlatform/posts/RedditplatformPostsController";
import { RedditplatformUserPostsController } from "./controllers/redditPlatform/user/posts/RedditplatformUserPostsController";
import { RedditplatformUserPostsImagesController } from "./controllers/redditPlatform/user/posts/images/RedditplatformUserPostsImagesController";
import { RedditplatformUserPostsCommentsController } from "./controllers/redditPlatform/user/posts/comments/RedditplatformUserPostsCommentsController";
import { RedditplatformUserPostsVotesController } from "./controllers/redditPlatform/user/posts/votes/RedditplatformUserPostsVotesController";
import { RedditplatformPostsVotesController } from "./controllers/redditPlatform/posts/votes/RedditplatformPostsVotesController";
import { RedditplatformThresholdsController } from "./controllers/redditPlatform/thresholds/RedditplatformThresholdsController";
import { RedditplatformSiteadminThresholdsController } from "./controllers/redditPlatform/siteAdmin/thresholds/RedditplatformSiteadminThresholdsController";
import { RedditplatformCommunityadminThresholdsController } from "./controllers/redditPlatform/communityAdmin/thresholds/RedditplatformCommunityadminThresholdsController";
import { RedditplatformSiteadminDecaysController } from "./controllers/redditPlatform/siteAdmin/decays/RedditplatformSiteadminDecaysController";
import { RedditplatformCommunityadminDecaysController } from "./controllers/redditPlatform/communityAdmin/decays/RedditplatformCommunityadminDecaysController";
import { RedditplatformUserAwardsController } from "./controllers/redditPlatform/user/awards/RedditplatformUserAwardsController";
import { RedditplatformAwardsController } from "./controllers/redditPlatform/awards/RedditplatformAwardsController";
import { RedditplatformSiteadminAwardsController } from "./controllers/redditPlatform/siteAdmin/awards/RedditplatformSiteadminAwardsController";
import { RedditplatformLeaderboardsController } from "./controllers/redditPlatform/leaderboards/RedditplatformLeaderboardsController";
import { RedditplatformUserLeaderboardsController } from "./controllers/redditPlatform/user/leaderboards/RedditplatformUserLeaderboardsController";
import { RedditplatformSiteadminLeaderboardsController } from "./controllers/redditPlatform/siteAdmin/leaderboards/RedditplatformSiteadminLeaderboardsController";
import { RedditplatformUserUsersKarmasController } from "./controllers/redditPlatform/user/users/karmas/RedditplatformUserUsersKarmasController";
import { RedditplatformSiteadminUsersKarmasController } from "./controllers/redditPlatform/siteAdmin/users/karmas/RedditplatformSiteadminUsersKarmasController";
import { RedditplatformUserUsersKarmasTransactionsController } from "./controllers/redditPlatform/user/users/karmas/transactions/RedditplatformUserUsersKarmasTransactionsController";
import { RedditplatformUsersKarmasTransactionsController } from "./controllers/redditPlatform/users/karmas/transactions/RedditplatformUsersKarmasTransactionsController";
import { RedditplatformCommunityadminReportsCategoriesController } from "./controllers/redditPlatform/communityAdmin/reports/categories/RedditplatformCommunityadminReportsCategoriesController";
import { RedditplatformSiteadminReportsCategoriesController } from "./controllers/redditPlatform/siteAdmin/reports/categories/RedditplatformSiteadminReportsCategoriesController";
import { RedditplatformUserReportsCategoriesController } from "./controllers/redditPlatform/user/reports/categories/RedditplatformUserReportsCategoriesController";
import { RedditplatformCommunityadminReportsController } from "./controllers/redditPlatform/communityAdmin/reports/RedditplatformCommunityadminReportsController";
import { RedditplatformSiteadminReportsController } from "./controllers/redditPlatform/siteAdmin/reports/RedditplatformSiteadminReportsController";
import { RedditplatformUserReportsController } from "./controllers/redditPlatform/user/reports/RedditplatformUserReportsController";
import { RedditplatformUserReportsHistoryController } from "./controllers/redditPlatform/user/reports/history/RedditplatformUserReportsHistoryController";
import { RedditplatformSiteadminReportsHistoryController } from "./controllers/redditPlatform/siteAdmin/reports/history/RedditplatformSiteadminReportsHistoryController";
import { RedditplatformCommunityadminReportsHistoryController } from "./controllers/redditPlatform/communityAdmin/reports/history/RedditplatformCommunityadminReportsHistoryController";
import { RedditplatformUserReportsNotificationsController } from "./controllers/redditPlatform/user/reports/notifications/RedditplatformUserReportsNotificationsController";
import { RedditplatformSiteadminReportsNotificationsController } from "./controllers/redditPlatform/siteAdmin/reports/notifications/RedditplatformSiteadminReportsNotificationsController";
import { RedditplatformCommunityadminReportsNotificationsController } from "./controllers/redditPlatform/communityAdmin/reports/notifications/RedditplatformCommunityadminReportsNotificationsController";
import { RedditplatformUserReportsHistoriesController } from "./controllers/redditPlatform/user/reports/histories/RedditplatformUserReportsHistoriesController";
import { RedditplatformCommunityadminReportsHistoriesController } from "./controllers/redditPlatform/communityAdmin/reports/histories/RedditplatformCommunityadminReportsHistoriesController";
import { RedditplatformSiteadminReportsHistoriesController } from "./controllers/redditPlatform/siteAdmin/reports/histories/RedditplatformSiteadminReportsHistoriesController";
import { RedditplatformSiteadminUsersController } from "./controllers/redditPlatform/siteAdmin/users/RedditplatformSiteadminUsersController";
import { RedditplatformUserUsersController } from "./controllers/redditPlatform/user/users/RedditplatformUserUsersController";
import { RedditplatformUserKarmasController } from "./controllers/redditPlatform/user/karmas/RedditplatformUserKarmasController";
import { RedditplatformUserActivitiesController } from "./controllers/redditPlatform/user/activities/RedditplatformUserActivitiesController";
import { RedditplatformUserUsersProfilesController } from "./controllers/redditPlatform/user/users/profiles/RedditplatformUserUsersProfilesController";
import { RedditplatformUserUsersCommunitySubscriptionsController } from "./controllers/redditPlatform/user/users/community/subscriptions/RedditplatformUserUsersCommunitySubscriptionsController";
import { RedditplatformUserUsersCommunitiesSubscriptionsController } from "./controllers/redditPlatform/user/users/communities/subscriptions/RedditplatformUserUsersCommunitiesSubscriptionsController";
import { RedditplatformCommunityadminUsersCommunitiesSubscriptionsController } from "./controllers/redditPlatform/communityAdmin/users/communities/subscriptions/RedditplatformCommunityadminUsersCommunitiesSubscriptionsController";
import { RedditplatformCommunitiesController } from "./controllers/redditPlatform/communities/RedditplatformCommunitiesController";
import { RedditplatformSiteadminCommunitiesController } from "./controllers/redditPlatform/siteAdmin/communities/RedditplatformSiteadminCommunitiesController";
import { RedditplatformSiteadminKarmasController } from "./controllers/redditPlatform/siteAdmin/karmas/RedditplatformSiteadminKarmasController";
import { RedditplatformSiteadminAnalyticsChannelsMonthlyController } from "./controllers/redditPlatform/siteAdmin/analytics/channels/monthly/RedditplatformSiteadminAnalyticsChannelsMonthlyController";
import { RedditplatformSiteadminDashboardSystemOverviewController } from "./controllers/redditPlatform/siteAdmin/dashboard/system/overview/RedditplatformSiteadminDashboardSystemOverviewController";
import { RedditplatformUserSearchChannelsAdvancedController } from "./controllers/redditPlatform/user/search/channels/advanced/RedditplatformUserSearchChannelsAdvancedController";
import { RedditplatformCommunityadminReportsChannelsHistoryController } from "./controllers/redditPlatform/communityAdmin/reports/channels/history/RedditplatformCommunityadminReportsChannelsHistoryController";
import { RedditplatformSiteadminReportsChannelsHistoryController } from "./controllers/redditPlatform/siteAdmin/reports/channels/history/RedditplatformSiteadminReportsChannelsHistoryController";
import { RedditplatformCommunitiesTopController } from "./controllers/redditPlatform/communities/top/RedditplatformCommunitiesTopController";
import { RedditplatformCommunitiesSubscriptionsTrendsController } from "./controllers/redditPlatform/communities/subscriptions/trends/RedditplatformCommunitiesSubscriptionsTrendsController";
import { RedditplatformCommunityadminCommunitiesMetricsController } from "./controllers/redditPlatform/communityAdmin/communities/metrics/RedditplatformCommunityadminCommunitiesMetricsController";
import { RedditplatformSiteadminCommunitiesMetricsController } from "./controllers/redditPlatform/siteAdmin/communities/metrics/RedditplatformSiteadminCommunitiesMetricsController";
import { RedditplatformSiteadminAnalyticsPostsHotController } from "./controllers/redditPlatform/siteAdmin/analytics/posts/hot/RedditplatformSiteadminAnalyticsPostsHotController";
import { RedditplatformUserKarmasDaily_bonusController } from "./controllers/redditPlatform/user/karmas/daily-bonus/RedditplatformUserKarmasDaily_bonusController";
import { RedditplatformSiteadminKarmasAnti_gamingController } from "./controllers/redditPlatform/siteAdmin/karmas/anti-gaming/RedditplatformSiteadminKarmasAnti_gamingController";
import { RedditplatformSiteadminReportsAnalyticsDailyController } from "./controllers/redditPlatform/siteAdmin/reports/analytics/daily/RedditplatformSiteadminReportsAnalyticsDailyController";
import { RedditplatformSiteadminReportsAnalyticsResolution_ratesController } from "./controllers/redditPlatform/siteAdmin/reports/analytics/resolution-rates/RedditplatformSiteadminReportsAnalyticsResolution_ratesController";
import { RedditplatformCommunityadminReportsSearchController } from "./controllers/redditPlatform/communityAdmin/reports/search/RedditplatformCommunityadminReportsSearchController";
import { RedditplatformSiteadminReportsSearchController } from "./controllers/redditPlatform/siteAdmin/reports/search/RedditplatformSiteadminReportsSearchController";
import { RedditplatformUserDashboardUsersOverviewController } from "./controllers/redditPlatform/user/dashboard/users/overview/RedditplatformUserDashboardUsersOverviewController";
import { RedditplatformSearchGlobalController } from "./controllers/redditPlatform/search/global/RedditplatformSearchGlobalController";
import { RedditplatformAnalyticsPostsPopularityController } from "./controllers/redditPlatform/analytics/posts/popularity/RedditplatformAnalyticsPostsPopularityController";
import { RedditplatformSiteadminAnalyticsCommunitiesActivityController } from "./controllers/redditPlatform/siteAdmin/analytics/communities/activity/RedditplatformSiteadminAnalyticsCommunitiesActivityController";
import { RedditplatformUserAnalyticsKarmasTrendsController } from "./controllers/redditPlatform/user/analytics/karmas/trends/RedditplatformUserAnalyticsKarmasTrendsController";
import { RedditplatformCommunityadminAnalyticsKarmasTrendsController } from "./controllers/redditPlatform/communityAdmin/analytics/karmas/trends/RedditplatformCommunityadminAnalyticsKarmasTrendsController";
import { RedditplatformSiteadminAnalyticsKarmasTrendsController } from "./controllers/redditPlatform/siteAdmin/analytics/karmas/trends/RedditplatformSiteadminAnalyticsKarmasTrendsController";
import { RedditplatformSiteadminDashboardAdminController } from "./controllers/redditPlatform/siteAdmin/dashboard/admin/overview/RedditplatformSiteadminDashboardAdminController";
import { RedditplatformUserDashboardUserOverviewController } from "./controllers/redditPlatform/user/dashboard/user/overview/RedditplatformUserDashboardUserOverviewController";
import { RedditplatformSiteadminDashboardReportsSummaryController } from "./controllers/redditPlatform/siteAdmin/dashboard/reports/summary/RedditplatformSiteadminDashboardReportsSummaryController";
import { RedditplatformUserDashboardKarmaRankingsController } from "./controllers/redditPlatform/user/dashboard/karma/rankings/RedditplatformUserDashboardKarmaRankingsController";
import { RedditplatformSiteadminDashboardContentTrendsController } from "./controllers/redditPlatform/siteAdmin/dashboard/content/trends/RedditplatformSiteadminDashboardContentTrendsController";

@Module({
  controllers: [
    AuthUserController,
    UserProfileController,
    AuthCommunityadminController,
    AuthSiteadminController,
    RedditplatformChannelsController,
    RedditplatformCommunityadminChannelsController,
    RedditplatformSiteadminChannelsController,
    RedditplatformCommunityadminChannelsSectionsController,
    RedditplatformSiteadminChannelsSectionsController,
    RedditplatformUserChannelsSectionsController,
    RedditplatformSiteadminConfigurationsController,
    RedditplatformSiteadminLoginAttemptsController,
    RedditplatformSiteadminTokensController,
    RedditplatformUserTokensController,
    RedditplatformTokensController,
    RedditplatformResetsController,
    RedditplatformUserResetsController,
    RedditplatformUserUsersSessionsController,
    RedditplatformSiteadminUsersSessionsController,
    RedditplatformCommunityadminCommunityadminsSessionsController,
    RedditplatformSiteadminCommunityadminsSessionsController,
    RedditplatformSiteadminSiteadminsSessionsController,
    RedditplatformUserCommunitiesController,
    RedditplatformCommunityadminCommunitiesController,
    RedditplatformCommunityadminRulesController,
    RedditplatformRulesController,
    RedditplatformUserSubscriptionsController,
    RedditplatformPostsController,
    RedditplatformUserPostsController,
    RedditplatformUserPostsImagesController,
    RedditplatformUserPostsCommentsController,
    RedditplatformUserPostsVotesController,
    RedditplatformPostsVotesController,
    RedditplatformThresholdsController,
    RedditplatformSiteadminThresholdsController,
    RedditplatformCommunityadminThresholdsController,
    RedditplatformSiteadminDecaysController,
    RedditplatformCommunityadminDecaysController,
    RedditplatformUserAwardsController,
    RedditplatformAwardsController,
    RedditplatformSiteadminAwardsController,
    RedditplatformLeaderboardsController,
    RedditplatformUserLeaderboardsController,
    RedditplatformSiteadminLeaderboardsController,
    RedditplatformUserUsersKarmasController,
    RedditplatformSiteadminUsersKarmasController,
    RedditplatformUserUsersKarmasTransactionsController,
    RedditplatformUsersKarmasTransactionsController,
    RedditplatformCommunityadminReportsCategoriesController,
    RedditplatformSiteadminReportsCategoriesController,
    RedditplatformUserReportsCategoriesController,
    RedditplatformCommunityadminReportsController,
    RedditplatformSiteadminReportsController,
    RedditplatformUserReportsController,
    RedditplatformUserReportsHistoryController,
    RedditplatformSiteadminReportsHistoryController,
    RedditplatformCommunityadminReportsHistoryController,
    RedditplatformUserReportsNotificationsController,
    RedditplatformSiteadminReportsNotificationsController,
    RedditplatformCommunityadminReportsNotificationsController,
    RedditplatformUserReportsHistoriesController,
    RedditplatformCommunityadminReportsHistoriesController,
    RedditplatformSiteadminReportsHistoriesController,
    RedditplatformSiteadminUsersController,
    RedditplatformUserUsersController,
    RedditplatformUserKarmasController,
    RedditplatformUserActivitiesController,
    RedditplatformUserUsersProfilesController,
    RedditplatformUserUsersCommunitySubscriptionsController,
    RedditplatformUserUsersCommunitiesSubscriptionsController,
    RedditplatformCommunityadminUsersCommunitiesSubscriptionsController,
    RedditplatformCommunitiesController,
    RedditplatformSiteadminCommunitiesController,
    RedditplatformSiteadminKarmasController,
    RedditplatformSiteadminAnalyticsChannelsMonthlyController,
    RedditplatformSiteadminDashboardSystemOverviewController,
    RedditplatformUserSearchChannelsAdvancedController,
    RedditplatformCommunityadminReportsChannelsHistoryController,
    RedditplatformSiteadminReportsChannelsHistoryController,
    RedditplatformCommunitiesTopController,
    RedditplatformCommunitiesSubscriptionsTrendsController,
    RedditplatformCommunityadminCommunitiesMetricsController,
    RedditplatformSiteadminCommunitiesMetricsController,
    RedditplatformSiteadminAnalyticsPostsHotController,
    RedditplatformUserKarmasDaily_bonusController,
    RedditplatformSiteadminKarmasAnti_gamingController,
    RedditplatformSiteadminReportsAnalyticsDailyController,
    RedditplatformSiteadminReportsAnalyticsResolution_ratesController,
    RedditplatformCommunityadminReportsSearchController,
    RedditplatformSiteadminReportsSearchController,
    RedditplatformUserDashboardUsersOverviewController,
    RedditplatformSearchGlobalController,
    RedditplatformAnalyticsPostsPopularityController,
    RedditplatformSiteadminAnalyticsCommunitiesActivityController,
    RedditplatformUserAnalyticsKarmasTrendsController,
    RedditplatformCommunityadminAnalyticsKarmasTrendsController,
    RedditplatformSiteadminAnalyticsKarmasTrendsController,
    RedditplatformSiteadminDashboardAdminController,
    RedditplatformUserDashboardUserOverviewController,
    RedditplatformSiteadminDashboardReportsSummaryController,
    RedditplatformUserDashboardKarmaRankingsController,
    RedditplatformSiteadminDashboardContentTrendsController,
  ],
})
export class MyModule {}
