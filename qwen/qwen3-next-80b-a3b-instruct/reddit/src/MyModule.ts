import { Module } from "@nestjs/common";

import { AuthCitizenController } from "./controllers/auth/citizen/AuthCitizenController";
import { AuthModeratorController } from "./controllers/auth/moderator/AuthModeratorController";
import { AuthAdminController } from "./controllers/auth/admin/AuthAdminController";
import { CommunitybbsPostsController } from "./controllers/communityBBS/posts/CommunitybbsPostsController";
import { CommunitybbsCitizenPostsController } from "./controllers/communityBBS/citizen/posts/CommunitybbsCitizenPostsController";
import { CommunitybbsCommentsController } from "./controllers/communityBBS/comments/CommunitybbsCommentsController";
import { CommunitybbsCitizenCommentsController } from "./controllers/communityBBS/citizen/comments/CommunitybbsCitizenCommentsController";
import { CommunitybbsModeratorReportsController } from "./controllers/communityBBS/moderator/reports/CommunitybbsModeratorReportsController";
import { CommunitybbsAdminReportsController } from "./controllers/communityBBS/admin/reports/CommunitybbsAdminReportsController";
import { CommunitybbsCitizenReportsController } from "./controllers/communityBBS/citizen/reports/CommunitybbsCitizenReportsController";
import { CommunitybbsCitizenProfilesController } from "./controllers/communityBBS/citizen/profiles/CommunitybbsCitizenProfilesController";
import { CommunitybbsProfilesController } from "./controllers/communityBBS/profiles/CommunitybbsProfilesController";
import { CommunitybbsPostsCommentsController } from "./controllers/communityBBS/posts/comments/CommunitybbsPostsCommentsController";
import { CommunitybbsCitizenPostsCommentsController } from "./controllers/communityBBS/citizen/posts/comments/CommunitybbsCitizenPostsCommentsController";
import { CommunitybbsAdminPostsCommentsController } from "./controllers/communityBBS/admin/posts/comments/CommunitybbsAdminPostsCommentsController";
import { CommunitybbsCitizenPostsVotesController } from "./controllers/communityBBS/citizen/posts/votes/CommunitybbsCitizenPostsVotesController";
import { CommunitybbsAdminPostsVotesController } from "./controllers/communityBBS/admin/posts/votes/CommunitybbsAdminPostsVotesController";
import { CommunitybbsModeratorPostsVotesController } from "./controllers/communityBBS/moderator/posts/votes/CommunitybbsModeratorPostsVotesController";
import { CommunitybbsCitizenCommentsVotesController } from "./controllers/communityBBS/citizen/comments/votes/CommunitybbsCitizenCommentsVotesController";
import { CommunitybbsCitizenCitizensKarmaController } from "./controllers/communityBBS/citizen/citizens/karma/CommunitybbsCitizenCitizensKarmaController";
import { CommunitybbsCitizenCitizensKarmaHistoryController } from "./controllers/communityBBS/citizen/citizens/karma/history/CommunitybbsCitizenCitizensKarmaHistoryController";
import { CommunitybbsAdminCitizensKarmaHistoryController } from "./controllers/communityBBS/admin/citizens/karma/history/CommunitybbsAdminCitizensKarmaHistoryController";
import { CommunitybbsAdminAnalyticsUser_engagementController } from "./controllers/communityBBS/admin/analytics/user-engagement/CommunitybbsAdminAnalyticsUser_engagementController";
import { CommunitybbsAdminAnalyticsContent_trendsController } from "./controllers/communityBBS/admin/analytics/content-trends/CommunitybbsAdminAnalyticsContent_trendsController";
import { CommunitybbsAdminAnalyticsModeration_efficiencyController } from "./controllers/communityBBS/admin/analytics/moderation-efficiency/CommunitybbsAdminAnalyticsModeration_efficiencyController";
import { CommunitybbsAnalyticsReputation_patternsController } from "./controllers/communityBBS/analytics/reputation-patterns/CommunitybbsAnalyticsReputation_patternsController";
import { CommunitybbsAnalyticsReport_coverageController } from "./controllers/communityBBS/analytics/report-coverage/CommunitybbsAnalyticsReport_coverageController";
import { CommunitybbsAdminAnalyticsSystem_usageController } from "./controllers/communityBBS/admin/analytics/system-usage/CommunitybbsAdminAnalyticsSystem_usageController";
import { CommunitybbsAdminAnalyticsCommunity_performanceController } from "./controllers/communityBBS/admin/analytics/community-performance/CommunitybbsAdminAnalyticsCommunity_performanceController";
import { CommunitybbsModeratorAnalyticsCommunity_performanceController } from "./controllers/communityBBS/moderator/analytics/community-performance/CommunitybbsModeratorAnalyticsCommunity_performanceController";
import { CommunitybbsAnalyticsKarma_distributionController } from "./controllers/communityBBS/analytics/karma-distribution/CommunitybbsAnalyticsKarma_distributionController";
import { CommunitybbsAnalyticsActive_usersController } from "./controllers/communityBBS/analytics/active-users/CommunitybbsAnalyticsActive_usersController";
import { CommunitybbsAdminAnalyticsDaily_metricsController } from "./controllers/communityBBS/admin/analytics/daily-metrics/CommunitybbsAdminAnalyticsDaily_metricsController";
import { CommunitybbsAdminDashboardOverviewController } from "./controllers/communityBBS/admin/dashboard/overview/CommunitybbsAdminDashboardOverviewController";
import { CommunitybbsModeratorDashboardModeration_queueController } from "./controllers/communityBBS/moderator/dashboard/moderation-queue/CommunitybbsModeratorDashboardModeration_queueController";
import { CommunitybbsAdminDashboardModeration_queueController } from "./controllers/communityBBS/admin/dashboard/moderation-queue/CommunitybbsAdminDashboardModeration_queueController";
import { CommunitybbsDashboardSystem_healthController } from "./controllers/communityBBS/dashboard/system-health/CommunitybbsDashboardSystem_healthController";
import { CommunitybbsDashboardUser_activityController } from "./controllers/communityBBS/dashboard/user-activity/CommunitybbsDashboardUser_activityController";
import { CommunitybbsDashboardCommunity_statsController } from "./controllers/communityBBS/dashboard/community-stats/CommunitybbsDashboardCommunity_statsController";
import { CommunitybbsAdminDashboardCompliance_alertsController } from "./controllers/communityBBS/admin/dashboard/compliance-alerts/CommunitybbsAdminDashboardCompliance_alertsController";
import { CommunitybbsAdminDashboardReport_trendsController } from "./controllers/communityBBS/admin/dashboard/report-trends/CommunitybbsAdminDashboardReport_trendsController";
import { CommunitybbsCitizenDashboardReputation_metricsController } from "./controllers/communityBBS/citizen/dashboard/reputation-metrics/CommunitybbsCitizenDashboardReputation_metricsController";
import { CommunitybbsController } from "./controllers/communityBBS/search/CommunitybbsController";

@Module({
  controllers: [
    AuthCitizenController,
    AuthModeratorController,
    AuthAdminController,
    CommunitybbsPostsController,
    CommunitybbsCitizenPostsController,
    CommunitybbsCommentsController,
    CommunitybbsCitizenCommentsController,
    CommunitybbsModeratorReportsController,
    CommunitybbsAdminReportsController,
    CommunitybbsCitizenReportsController,
    CommunitybbsCitizenProfilesController,
    CommunitybbsProfilesController,
    CommunitybbsPostsCommentsController,
    CommunitybbsCitizenPostsCommentsController,
    CommunitybbsAdminPostsCommentsController,
    CommunitybbsCitizenPostsVotesController,
    CommunitybbsAdminPostsVotesController,
    CommunitybbsModeratorPostsVotesController,
    CommunitybbsCitizenCommentsVotesController,
    CommunitybbsCitizenCitizensKarmaController,
    CommunitybbsCitizenCitizensKarmaHistoryController,
    CommunitybbsAdminCitizensKarmaHistoryController,
    CommunitybbsAdminAnalyticsUser_engagementController,
    CommunitybbsAdminAnalyticsContent_trendsController,
    CommunitybbsAdminAnalyticsModeration_efficiencyController,
    CommunitybbsAnalyticsReputation_patternsController,
    CommunitybbsAnalyticsReport_coverageController,
    CommunitybbsAdminAnalyticsSystem_usageController,
    CommunitybbsAdminAnalyticsCommunity_performanceController,
    CommunitybbsModeratorAnalyticsCommunity_performanceController,
    CommunitybbsAnalyticsKarma_distributionController,
    CommunitybbsAnalyticsActive_usersController,
    CommunitybbsAdminAnalyticsDaily_metricsController,
    CommunitybbsAdminDashboardOverviewController,
    CommunitybbsModeratorDashboardModeration_queueController,
    CommunitybbsAdminDashboardModeration_queueController,
    CommunitybbsDashboardSystem_healthController,
    CommunitybbsDashboardUser_activityController,
    CommunitybbsDashboardCommunity_statsController,
    CommunitybbsAdminDashboardCompliance_alertsController,
    CommunitybbsAdminDashboardReport_trendsController,
    CommunitybbsCitizenDashboardReputation_metricsController,
    CommunitybbsController,
  ],
})
export class MyModule {}
