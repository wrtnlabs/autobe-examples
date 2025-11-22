import { Module } from "@nestjs/common";

import { AuthGuestuserController } from "./controllers/auth/guestUser/AuthGuestuserController";
import { AuthRegistereduserController } from "./controllers/auth/registeredUser/AuthRegistereduserController";
import { AuthRegistereduserPasswordResetController } from "./controllers/auth/registeredUser/password/reset/AuthRegistereduserPasswordResetController";
import { AuthRegistereduserEmailVerifyController } from "./controllers/auth/registeredUser/email/verify/AuthRegistereduserEmailVerifyController";
import { AuthCommunitymoderatorController } from "./controllers/auth/communityModerator/AuthCommunitymoderatorController";
import { AuthPlatformadministratorController } from "./controllers/auth/platformAdministrator/AuthPlatformadministratorController";
import { RedditplatformRegistereduserAuthProfileController } from "./controllers/redditPlatform/registeredUser/auth/profile/RedditplatformRegistereduserAuthProfileController";
import { RedditplatformRegistereduserAuthSessionsController } from "./controllers/redditPlatform/registeredUser/auth/sessions/RedditplatformRegistereduserAuthSessionsController";
import { RedditplatformPlatformadministratorAuthSessionsController } from "./controllers/redditPlatform/platformAdministrator/auth/sessions/RedditplatformPlatformadministratorAuthSessionsController";
import { RedditplatformCommunitymoderatorAuthSessionsController } from "./controllers/redditPlatform/communityModerator/auth/sessions/RedditplatformCommunitymoderatorAuthSessionsController";
import { RedditplatformRegistereduserAuthController } from "./controllers/redditPlatform/registeredUser/auth/settings/RedditplatformRegistereduserAuthController";
import { RedditplatformRegistereduserAuth_settingsController } from "./controllers/redditPlatform/registeredUser/auth/settings/RedditplatformRegistereduserAuth_settingsController";
import { RedditplatformCommunitymoderatorAuthController } from "./controllers/redditPlatform/communityModerator/auth/settings/RedditplatformCommunitymoderatorAuthController";
import { RedditplatformPlatformadministratorAuthController } from "./controllers/redditPlatform/platformAdministrator/auth/settings/RedditplatformPlatformadministratorAuthController";
import { RedditplatformRegistereduserAuthTwofactorController } from "./controllers/redditPlatform/registeredUser/auth/twoFactor/RedditplatformRegistereduserAuthTwofactorController";
import { RedditplatformRegistereduserAuthTwofactorVerifyController } from "./controllers/redditPlatform/registeredUser/auth/twoFactor/verify/RedditplatformRegistereduserAuthTwofactorVerifyController";
import { RedditplatformRegistereduserAuthTwofactorDisableController } from "./controllers/redditPlatform/registeredUser/auth/twoFactor/disable/RedditplatformRegistereduserAuthTwofactorDisableController";
import { RedditplatformGuestuserCommunitiesController } from "./controllers/redditPlatform/guestUser/communities/RedditplatformGuestuserCommunitiesController";
import { RedditplatformRegistereduserCommunitiesController } from "./controllers/redditPlatform/registeredUser/communities/RedditplatformRegistereduserCommunitiesController";
import { RedditplatformCommunitiesController } from "./controllers/redditPlatform/communities/RedditplatformCommunitiesController";
import { RedditplatformCommunitiesMembersController } from "./controllers/redditPlatform/communities/members/RedditplatformCommunitiesMembersController";
import { RedditplatformRegistereduserCommunitiesMembersController } from "./controllers/redditPlatform/registeredUser/communities/members/RedditplatformRegistereduserCommunitiesMembersController";
import { RedditplatformCommunitymoderatorCommunitiesMembersController } from "./controllers/redditPlatform/communityModerator/communities/members/RedditplatformCommunitymoderatorCommunitiesMembersController";
import { RedditplatformMembershipsController } from "./controllers/redditPlatform/memberships/RedditplatformMembershipsController";
import { RedditplatformPlatformadministratorCommunitiesMembersController } from "./controllers/redditPlatform/platformAdministrator/communities/members/RedditplatformPlatformadministratorCommunitiesMembersController";
import { RedditplatformCommunitymoderatorCommunitiesRulesController } from "./controllers/redditPlatform/communityModerator/communities/rules/RedditplatformCommunitymoderatorCommunitiesRulesController";
import { RedditplatformPlatformadministratorCommunitiesRulesController } from "./controllers/redditPlatform/platformAdministrator/communities/rules/RedditplatformPlatformadministratorCommunitiesRulesController";
import { RedditplatformRegistereduserCommunitiesRulesController } from "./controllers/redditPlatform/registeredUser/communities/rules/RedditplatformRegistereduserCommunitiesRulesController";
import { RedditplatformRegistereduserCommunitiesSubscriptionsController } from "./controllers/redditPlatform/registeredUser/communities/subscriptions/RedditplatformRegistereduserCommunitiesSubscriptionsController";
import { RedditplatformCommunitiesSubscriptionsController } from "./controllers/redditPlatform/communities/subscriptions/RedditplatformCommunitiesSubscriptionsController";
import { RedditplatformPostsController } from "./controllers/redditPlatform/posts/RedditplatformPostsController";
import { RedditplatformRegistereduserPostsController } from "./controllers/redditPlatform/registeredUser/posts/RedditplatformRegistereduserPostsController";
import { RedditplatformCommunitymoderatorPostsController } from "./controllers/redditPlatform/communityModerator/posts/RedditplatformCommunitymoderatorPostsController";
import { RedditplatformPlatformadministratorPostsController } from "./controllers/redditPlatform/platformAdministrator/posts/RedditplatformPlatformadministratorPostsController";
import { RedditplatformRegistereduserPostsMetadataController } from "./controllers/redditPlatform/registeredUser/posts/metadata/RedditplatformRegistereduserPostsMetadataController";
import { RedditplatformPostsCommentsController } from "./controllers/redditPlatform/posts/comments/RedditplatformPostsCommentsController";
import { RedditplatformRegistereduserPostsCommentsController } from "./controllers/redditPlatform/registeredUser/posts/comments/RedditplatformRegistereduserPostsCommentsController";
import { RedditplatformRegistereduserPostsCommentsRepliesController } from "./controllers/redditPlatform/registeredUser/posts/comments/replies/RedditplatformRegistereduserPostsCommentsRepliesController";
import { RedditplatformCommunitymoderatorPostsCommentsController } from "./controllers/redditPlatform/communityModerator/posts/comments/RedditplatformCommunitymoderatorPostsCommentsController";
import { RedditplatformPlatformadministratorPostsCommentsController } from "./controllers/redditPlatform/platformAdministrator/posts/comments/RedditplatformPlatformadministratorPostsCommentsController";
import { RedditplatformPostsThreadsController } from "./controllers/redditPlatform/posts/threads/RedditplatformPostsThreadsController";
import { RedditplatformPostsCommentsThreadController } from "./controllers/redditPlatform/posts/comments/thread/RedditplatformPostsCommentsThreadController";
import { RedditplatformPostsVotesController } from "./controllers/redditPlatform/posts/votes/RedditplatformPostsVotesController";
import { RedditplatformRegistereduserPostsVotesController } from "./controllers/redditPlatform/registeredUser/posts/votes/RedditplatformRegistereduserPostsVotesController";
import { RedditplatformRegistereduserCommentsVotesController } from "./controllers/redditPlatform/registeredUser/comments/votes/RedditplatformRegistereduserCommentsVotesController";
import { RedditplatformRegistereduserCommentsVoteController } from "./controllers/redditPlatform/registeredUser/comments/vote/RedditplatformRegistereduserCommentsVoteController";
import { RedditplatformCommentsVotesController } from "./controllers/redditPlatform/comments/votes/RedditplatformCommentsVotesController";
import { RedditplatformUsersKarmaController } from "./controllers/redditPlatform/users/karma/RedditplatformUsersKarmaController";
import { RedditplatformUsersKarmaCommunitiesController } from "./controllers/redditPlatform/users/karma/communities/RedditplatformUsersKarmaCommunitiesController";
import { RedditplatformUsersActivitiesController } from "./controllers/redditPlatform/users/activities/RedditplatformUsersActivitiesController";
import { UsersKarmaController } from "./controllers/users/karma/UsersKarmaController";
import { RedditplatformRegistereduserUsersActivitiesController } from "./controllers/redditPlatform/registeredUser/users/activities/RedditplatformRegistereduserUsersActivitiesController";
import { RedditplatformRegistereduserUsersActivities_exportController } from "./controllers/redditPlatform/registeredUser/users/activities/export/RedditplatformRegistereduserUsersActivities_exportController";
import { RedditplatformPostsEngagementController } from "./controllers/redditPlatform/posts/engagement/RedditplatformPostsEngagementController";
import { RedditplatformRegistereduserPostsEngagementController } from "./controllers/redditPlatform/registeredUser/posts/engagement/RedditplatformRegistereduserPostsEngagementController";
import { RedditplatformRegistereduserCommentsEngagementController } from "./controllers/redditPlatform/registeredUser/comments/engagement/RedditplatformRegistereduserCommentsEngagementController";
import { RedditplatformGuestuserCommentsEngagementController } from "./controllers/redditPlatform/guestUser/comments/engagement/RedditplatformGuestuserCommentsEngagementController";
import { RedditplatformPlatformadministratorAnalyticsContentperformanceController } from "./controllers/redditPlatform/platformAdministrator/analytics/contentPerformance/RedditplatformPlatformadministratorAnalyticsContentperformanceController";
import { RedditplatformCommunitymoderatorAnalyticsContentperformanceController } from "./controllers/redditPlatform/communityModerator/analytics/contentPerformance/RedditplatformCommunitymoderatorAnalyticsContentperformanceController";
import { RedditplatformPlatformadministratorAnalyticsUserbehaviorController } from "./controllers/redditPlatform/platformAdministrator/analytics/userBehavior/RedditplatformPlatformadministratorAnalyticsUserbehaviorController";
import { RedditplatformCommunitymoderatorAnalyticsUserbehaviorController } from "./controllers/redditPlatform/communityModerator/analytics/userBehavior/RedditplatformCommunitymoderatorAnalyticsUserbehaviorController";
import { RedditplatformPlatformadministratorAnalyticsEngagementtrendsController } from "./controllers/redditPlatform/platformAdministrator/analytics/engagementTrends/RedditplatformPlatformadministratorAnalyticsEngagementtrendsController";
import { RedditplatformCommunitymoderatorAnalyticsEngagementtrendsController } from "./controllers/redditPlatform/communityModerator/analytics/engagementTrends/RedditplatformCommunitymoderatorAnalyticsEngagementtrendsController";
import { RedditplatformPlatformadministratorReportsEngagementsummaryController } from "./controllers/redditPlatform/platformAdministrator/reports/engagementSummary/RedditplatformPlatformadministratorReportsEngagementsummaryController";
import { RedditplatformRegistereduserUsersKarmaHistoryController } from "./controllers/redditPlatform/registeredUser/users/karma/history/RedditplatformRegistereduserUsersKarmaHistoryController";
import { RedditplatformPlatformadministratorUsersKarmaHistoryController } from "./controllers/redditPlatform/platformAdministrator/users/karma/history/RedditplatformPlatformadministratorUsersKarmaHistoryController";
import { RedditplatformPlatformadministratorContentreportsController } from "./controllers/redditPlatform/platformAdministrator/contentReports/RedditplatformPlatformadministratorContentreportsController";
import { RedditplatformCommunitymoderatorContentreportsController } from "./controllers/redditPlatform/communityModerator/contentReports/RedditplatformCommunitymoderatorContentreportsController";
import { RedditplatformRegistereduserContentreportsController } from "./controllers/redditPlatform/registeredUser/contentReports/RedditplatformRegistereduserContentreportsController";
import { RedditplatformCommunitymoderatorModerationactionsController } from "./controllers/redditPlatform/communityModerator/moderationActions/RedditplatformCommunitymoderatorModerationactionsController";
import { RedditplatformPlatformadministratorModerationactionsController } from "./controllers/redditPlatform/platformAdministrator/moderationActions/RedditplatformPlatformadministratorModerationactionsController";
import { RedditplatformCommunitymoderatorModerationactionsAppealsController } from "./controllers/redditPlatform/communityModerator/moderationActions/appeals/RedditplatformCommunitymoderatorModerationactionsAppealsController";
import { RedditplatformPlatformadministratorModerationactionsAppealsController } from "./controllers/redditPlatform/platformAdministrator/moderationActions/appeals/RedditplatformPlatformadministratorModerationactionsAppealsController";
import { RedditplatformRegistereduserModerationactionsAppealsController } from "./controllers/redditPlatform/registeredUser/moderationActions/appeals/RedditplatformRegistereduserModerationactionsAppealsController";
import { RedditplatformRegistereduserAppealsController } from "./controllers/redditPlatform/registeredUser/appeals/RedditplatformRegistereduserAppealsController";
import { RedditplatformCommunitymoderatorAppealsController } from "./controllers/redditPlatform/communityModerator/appeals/RedditplatformCommunitymoderatorAppealsController";
import { RedditplatformPlatformadministratorAppealsController } from "./controllers/redditPlatform/platformAdministrator/appeals/RedditplatformPlatformadministratorAppealsController";
import { RedditplatformAnnouncementsController } from "./controllers/redditPlatform/announcements/RedditplatformAnnouncementsController";
import { RedditplatformPlatformadministratorAnnouncementsController } from "./controllers/redditPlatform/platformAdministrator/announcements/RedditplatformPlatformadministratorAnnouncementsController";
import { RedditplatformPlatformadministratorPlatformsettingsController } from "./controllers/redditPlatform/platformAdministrator/platformSettings/RedditplatformPlatformadministratorPlatformsettingsController";
import { RedditplatformPlatformsettingsController } from "./controllers/redditPlatform/platformSettings/RedditplatformPlatformsettingsController";

@Module({
  controllers: [
    AuthGuestuserController,
    AuthRegistereduserController,
    AuthRegistereduserPasswordResetController,
    AuthRegistereduserEmailVerifyController,
    AuthCommunitymoderatorController,
    AuthPlatformadministratorController,
    RedditplatformRegistereduserAuthProfileController,
    RedditplatformRegistereduserAuthSessionsController,
    RedditplatformPlatformadministratorAuthSessionsController,
    RedditplatformCommunitymoderatorAuthSessionsController,
    RedditplatformRegistereduserAuthController,
    RedditplatformRegistereduserAuth_settingsController,
    RedditplatformCommunitymoderatorAuthController,
    RedditplatformPlatformadministratorAuthController,
    RedditplatformRegistereduserAuthTwofactorController,
    RedditplatformRegistereduserAuthTwofactorVerifyController,
    RedditplatformRegistereduserAuthTwofactorDisableController,
    RedditplatformGuestuserCommunitiesController,
    RedditplatformRegistereduserCommunitiesController,
    RedditplatformCommunitiesController,
    RedditplatformCommunitiesMembersController,
    RedditplatformRegistereduserCommunitiesMembersController,
    RedditplatformCommunitymoderatorCommunitiesMembersController,
    RedditplatformMembershipsController,
    RedditplatformPlatformadministratorCommunitiesMembersController,
    RedditplatformCommunitymoderatorCommunitiesRulesController,
    RedditplatformPlatformadministratorCommunitiesRulesController,
    RedditplatformRegistereduserCommunitiesRulesController,
    RedditplatformRegistereduserCommunitiesSubscriptionsController,
    RedditplatformCommunitiesSubscriptionsController,
    RedditplatformPostsController,
    RedditplatformRegistereduserPostsController,
    RedditplatformCommunitymoderatorPostsController,
    RedditplatformPlatformadministratorPostsController,
    RedditplatformRegistereduserPostsMetadataController,
    RedditplatformPostsCommentsController,
    RedditplatformRegistereduserPostsCommentsController,
    RedditplatformRegistereduserPostsCommentsRepliesController,
    RedditplatformCommunitymoderatorPostsCommentsController,
    RedditplatformPlatformadministratorPostsCommentsController,
    RedditplatformPostsThreadsController,
    RedditplatformPostsCommentsThreadController,
    RedditplatformPostsVotesController,
    RedditplatformRegistereduserPostsVotesController,
    RedditplatformRegistereduserCommentsVotesController,
    RedditplatformRegistereduserCommentsVoteController,
    RedditplatformCommentsVotesController,
    RedditplatformUsersKarmaController,
    RedditplatformUsersKarmaCommunitiesController,
    RedditplatformUsersActivitiesController,
    UsersKarmaController,
    RedditplatformRegistereduserUsersActivitiesController,
    RedditplatformRegistereduserUsersActivities_exportController,
    RedditplatformPostsEngagementController,
    RedditplatformRegistereduserPostsEngagementController,
    RedditplatformRegistereduserCommentsEngagementController,
    RedditplatformGuestuserCommentsEngagementController,
    RedditplatformPlatformadministratorAnalyticsContentperformanceController,
    RedditplatformCommunitymoderatorAnalyticsContentperformanceController,
    RedditplatformPlatformadministratorAnalyticsUserbehaviorController,
    RedditplatformCommunitymoderatorAnalyticsUserbehaviorController,
    RedditplatformPlatformadministratorAnalyticsEngagementtrendsController,
    RedditplatformCommunitymoderatorAnalyticsEngagementtrendsController,
    RedditplatformPlatformadministratorReportsEngagementsummaryController,
    RedditplatformRegistereduserUsersKarmaHistoryController,
    RedditplatformPlatformadministratorUsersKarmaHistoryController,
    RedditplatformPlatformadministratorContentreportsController,
    RedditplatformCommunitymoderatorContentreportsController,
    RedditplatformRegistereduserContentreportsController,
    RedditplatformCommunitymoderatorModerationactionsController,
    RedditplatformPlatformadministratorModerationactionsController,
    RedditplatformCommunitymoderatorModerationactionsAppealsController,
    RedditplatformPlatformadministratorModerationactionsAppealsController,
    RedditplatformRegistereduserModerationactionsAppealsController,
    RedditplatformRegistereduserAppealsController,
    RedditplatformCommunitymoderatorAppealsController,
    RedditplatformPlatformadministratorAppealsController,
    RedditplatformAnnouncementsController,
    RedditplatformPlatformadministratorAnnouncementsController,
    RedditplatformPlatformadministratorPlatformsettingsController,
    RedditplatformPlatformsettingsController,
  ],
})
export class MyModule {}
