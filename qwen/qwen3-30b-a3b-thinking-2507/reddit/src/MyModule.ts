import { Module } from "@nestjs/common";

import { CommunityplatformAuthUserController } from "./controllers/communityPlatform/auth/user/CommunityplatformAuthUserController";
import { CommunityplatformCommunitiesController } from "./controllers/communityPlatform/communities/CommunityplatformCommunitiesController";
import { CommunityplatformCommunitiesFeedController } from "./controllers/communityPlatform/communities/feed/CommunityplatformCommunitiesFeedController";
import { CommunityplatformCommunitiesModeratorsController } from "./controllers/communityPlatform/communities/moderators/CommunityplatformCommunitiesModeratorsController";
import { CommunityplatformCommunitiesPostsController } from "./controllers/communityPlatform/communities/posts/CommunityplatformCommunitiesPostsController";
import { CommunityplatformCommunitiesSearchController } from "./controllers/communityPlatform/communities/search/CommunityplatformCommunitiesSearchController";
import { CommunityplatformCommunitiesSubscriptionsController } from "./controllers/communityPlatform/communities/subscriptions/CommunityplatformCommunitiesSubscriptionsController";
import { CommunityplatformCommunitiesTrendingController } from "./controllers/communityPlatform/communities/trending/CommunityplatformCommunitiesTrendingController";
import { CommunityplatformFeedsPopularController } from "./controllers/communityPlatform/feeds/popular/CommunityplatformFeedsPopularController";
import { CommunityplatformPostsController } from "./controllers/communityPlatform/posts/CommunityplatformPostsController";
import { CommunityplatformPostsCommentsController } from "./controllers/communityPlatform/posts/comments/CommunityplatformPostsCommentsController";
import { CommunityplatformPostsCommentsVotesController } from "./controllers/communityPlatform/posts/comments/votes/CommunityplatformPostsCommentsVotesController";
import { CommunityplatformPostsImage_uploadsController } from "./controllers/communityPlatform/posts/image-uploads/CommunityplatformPostsImage_uploadsController";
import { CommunityplatformPostsLink_urlsController } from "./controllers/communityPlatform/posts/link-urls/CommunityplatformPostsLink_urlsController";
import { CommunityplatformPostsText_contentsController } from "./controllers/communityPlatform/posts/text-contents/CommunityplatformPostsText_contentsController";
import { CommunityplatformUserAnalyticsChannelsController } from "./controllers/communityPlatform/user/analytics/channels/CommunityplatformUserAnalyticsChannelsController";
import { CommunityplatformUserAvatarsController } from "./controllers/communityPlatform/user/avatars/CommunityplatformUserAvatarsController";
import { CommunityplatformUserBansController } from "./controllers/communityPlatform/user/bans/CommunityplatformUserBansController";
import { CommunityplatformUserBansBan_reasonsController } from "./controllers/communityPlatform/user/bans/ban-reasons/CommunityplatformUserBansBan_reasonsController";
import { CommunityplatformUserChannelsController } from "./controllers/communityPlatform/user/channels/CommunityplatformUserChannelsController";
import { CommunityplatformUserChannelsFeaturesController } from "./controllers/communityPlatform/user/channels/features/CommunityplatformUserChannelsFeaturesController";
import { CommunityplatformUserCommentsThreadsController } from "./controllers/communityPlatform/user/comments/threads/CommunityplatformUserCommentsThreadsController";
import { CommunityplatformUserCommunitiesController } from "./controllers/communityPlatform/user/communities/CommunityplatformUserCommunitiesController";
import { CommunityplatformUserCommunitiesModeratorsController } from "./controllers/communityPlatform/user/communities/moderators/CommunityplatformUserCommunitiesModeratorsController";
import { CommunityplatformUserCommunitiesSubscriptionsController } from "./controllers/communityPlatform/user/communities/subscriptions/CommunityplatformUserCommunitiesSubscriptionsController";
import { CommunityplatformUserConfigurationsController } from "./controllers/communityPlatform/user/configurations/CommunityplatformUserConfigurationsController";
import { CommunityplatformUserEmail_verificationsController } from "./controllers/communityPlatform/user/email-verifications/CommunityplatformUserEmail_verificationsController";
import { CommunityplatformUserFeedsHomeController } from "./controllers/communityPlatform/user/feeds/home/CommunityplatformUserFeedsHomeController";
import { CommunityplatformUserHistoriesController } from "./controllers/communityPlatform/user/histories/CommunityplatformUserHistoriesController";
import { CommunityplatformUserKarmaController } from "./controllers/communityPlatform/user/karma/CommunityplatformUserKarmaController";
import { CommunityplatformUserModeration_actionsController } from "./controllers/communityPlatform/user/moderation-actions/CommunityplatformUserModeration_actionsController";
import { CommunityplatformUserModeration_settingsController } from "./controllers/communityPlatform/user/moderation-settings/CommunityplatformUserModeration_settingsController";
import { CommunityplatformUserPassword_resetsController } from "./controllers/communityPlatform/user/password-resets/CommunityplatformUserPassword_resetsController";
import { CommunityplatformUserPostsController } from "./controllers/communityPlatform/user/posts/CommunityplatformUserPostsController";
import { CommunityplatformUserPostsCommentsController } from "./controllers/communityPlatform/user/posts/comments/CommunityplatformUserPostsCommentsController";
import { CommunityplatformUserPostsCommentsVotesController } from "./controllers/communityPlatform/user/posts/comments/votes/CommunityplatformUserPostsCommentsVotesController";
import { CommunityplatformUserPostsVotesController } from "./controllers/communityPlatform/user/posts/votes/CommunityplatformUserPostsVotesController";
import { CommunityplatformUserProfileController } from "./controllers/communityPlatform/user/profile/CommunityplatformUserProfileController";
import { CommunityplatformUserReport_statusesController } from "./controllers/communityPlatform/user/report-statuses/CommunityplatformUserReport_statusesController";
import { CommunityplatformUserReportsController } from "./controllers/communityPlatform/user/reports/CommunityplatformUserReportsController";
import { CommunityplatformUserReportsConfigurationsController } from "./controllers/communityPlatform/user/reports/configurations/CommunityplatformUserReportsConfigurationsController";
import { CommunityplatformUserSectionsController } from "./controllers/communityPlatform/user/sections/CommunityplatformUserSectionsController";
import { CommunityplatformUserSessionsController } from "./controllers/communityPlatform/user/sessions/CommunityplatformUserSessionsController";
import { CommunityplatformUsersController } from "./controllers/communityPlatform/users/CommunityplatformUsersController";

@Module({
  controllers: [
    CommunityplatformAuthUserController,
    CommunityplatformUsersController,
    CommunityplatformUserProfileController,
    CommunityplatformUserSessionsController,
    CommunityplatformUserEmail_verificationsController,
    CommunityplatformUserPassword_resetsController,
    CommunityplatformCommunitiesController,
    CommunityplatformUserCommunitiesController,
    CommunityplatformCommunitiesSubscriptionsController,
    CommunityplatformUserCommunitiesSubscriptionsController,
    CommunityplatformCommunitiesModeratorsController,
    CommunityplatformUserCommunitiesModeratorsController,
    CommunityplatformPostsController,
    CommunityplatformUserPostsController,
    CommunityplatformPostsText_contentsController,
    CommunityplatformPostsLink_urlsController,
    CommunityplatformPostsImage_uploadsController,
    CommunityplatformPostsCommentsController,
    CommunityplatformUserPostsCommentsController,
    CommunityplatformPostsCommentsVotesController,
    CommunityplatformUserPostsCommentsVotesController,
    CommunityplatformUserKarmaController,
    CommunityplatformUserPostsVotesController,
    CommunityplatformUserReportsController,
    CommunityplatformUserReport_statusesController,
    CommunityplatformUserModeration_actionsController,
    CommunityplatformUserBansController,
    CommunityplatformUserBansBan_reasonsController,
    CommunityplatformUserModeration_settingsController,
    CommunityplatformUserChannelsController,
    CommunityplatformUserSectionsController,
    CommunityplatformUserConfigurationsController,
    CommunityplatformUserChannelsFeaturesController,
    CommunityplatformCommunitiesPostsController,
    CommunityplatformUserAvatarsController,
    CommunityplatformCommunitiesSearchController,
    CommunityplatformCommunitiesTrendingController,
    CommunityplatformUserFeedsHomeController,
    CommunityplatformFeedsPopularController,
    CommunityplatformUserCommentsThreadsController,
    CommunityplatformUserHistoriesController,
    CommunityplatformUserAnalyticsChannelsController,
    CommunityplatformUserReportsConfigurationsController,
    CommunityplatformCommunitiesFeedController,
  ],
})
export class MyModule {}
