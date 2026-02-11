import { Module } from "@nestjs/common";

import { RedditcommunityAudit_log_detailsController } from "./controllers/redditCommunity/audit-log-details/RedditcommunityAudit_log_detailsController";
import { RedditcommunityAudit_logsController } from "./controllers/redditCommunity/audit-logs/RedditcommunityAudit_logsController";
import { RedditcommunityAudit_logsDetailsController } from "./controllers/redditCommunity/audit-logs/details/RedditcommunityAudit_logsDetailsController";
import { RedditcommunityAuthCommunitymoderatorController } from "./controllers/redditCommunity/auth/communityModerator/RedditcommunityAuthCommunitymoderatorController";
import { RedditcommunityAuthCommunityownerController } from "./controllers/redditCommunity/auth/communityOwner/RedditcommunityAuthCommunityownerController";
import { RedditcommunityAuthGuestController } from "./controllers/redditCommunity/auth/guest/RedditcommunityAuthGuestController";
import { RedditcommunityAuthMemberController } from "./controllers/redditCommunity/auth/member/RedditcommunityAuthMemberController";
import { RedditcommunityAuthPlatformadminController } from "./controllers/redditCommunity/auth/platformadmin/RedditcommunityAuthPlatformadminController";
import { RedditcommunityCommunitiesController } from "./controllers/redditCommunity/communities/RedditcommunityCommunitiesController";
import { RedditcommunityCommunitymoderatorAnalyticsPostsController } from "./controllers/redditCommunity/communityModerator/analytics/posts/RedditcommunityCommunitymoderatorAnalyticsPostsController";
import { RedditcommunityCommunitymoderatorBansController } from "./controllers/redditCommunity/communityModerator/bans/RedditcommunityCommunitymoderatorBansController";
import { RedditcommunityCommunitymoderatorCommunitiesController } from "./controllers/redditCommunity/communityModerator/communities/RedditcommunityCommunitymoderatorCommunitiesController";
import { RedditcommunityCommunitymoderatorCommunitiesBansController } from "./controllers/redditCommunity/communityModerator/communities/bans/RedditcommunityCommunitymoderatorCommunitiesBansController";
import { RedditcommunityCommunitymoderatorCommunitiesReportsController } from "./controllers/redditCommunity/communityModerator/communities/reports/RedditcommunityCommunitymoderatorCommunitiesReportsController";
import { RedditcommunityCommunitymoderatorModeration_actionsController } from "./controllers/redditCommunity/communityModerator/moderation-actions/RedditcommunityCommunitymoderatorModeration_actionsController";
import { RedditcommunityCommunitymoderatorPostsController } from "./controllers/redditCommunity/communityModerator/posts/RedditcommunityCommunitymoderatorPostsController";
import { RedditcommunityCommunitymoderatorReportsController } from "./controllers/redditCommunity/communityModerator/reports/RedditcommunityCommunitymoderatorReportsController";
import { RedditcommunityCommunityownerAnalyticsPostsController } from "./controllers/redditCommunity/communityOwner/analytics/posts/RedditcommunityCommunityownerAnalyticsPostsController";
import { RedditcommunityCommunityownerBansController } from "./controllers/redditCommunity/communityOwner/bans/RedditcommunityCommunityownerBansController";
import { RedditcommunityCommunityownerCommunitiesController } from "./controllers/redditCommunity/communityOwner/communities/RedditcommunityCommunityownerCommunitiesController";
import { RedditcommunityCommunityownerCommunitiesBansController } from "./controllers/redditCommunity/communityOwner/communities/bans/RedditcommunityCommunityownerCommunitiesBansController";
import { RedditcommunityCommunityownerModeration_actionsController } from "./controllers/redditCommunity/communityOwner/moderation-actions/RedditcommunityCommunityownerModeration_actionsController";
import { RedditcommunityCommunityownerPostsController } from "./controllers/redditCommunity/communityOwner/posts/RedditcommunityCommunityownerPostsController";
import { RedditcommunityCommunityownerReportsController } from "./controllers/redditCommunity/communityOwner/reports/RedditcommunityCommunityownerReportsController";
import { RedditcommunityFeedsController } from "./controllers/redditCommunity/feeds/RedditcommunityFeedsController";
import { RedditcommunityGuestCommunitiesController } from "./controllers/redditCommunity/guest/communities/RedditcommunityGuestCommunitiesController";
import { RedditcommunityMaterialized_view_schedulesController } from "./controllers/redditCommunity/materialized-view-schedules/RedditcommunityMaterialized_view_schedulesController";
import { RedditcommunityMemberCommunitiesController } from "./controllers/redditCommunity/member/communities/RedditcommunityMemberCommunitiesController";
import { RedditcommunityMemberHomeController } from "./controllers/redditCommunity/member/home/RedditcommunityMemberHomeController";
import { RedditcommunityMemberPostsController } from "./controllers/redditCommunity/member/posts/RedditcommunityMemberPostsController";
import { RedditcommunityMemberProfileController } from "./controllers/redditCommunity/member/profile/RedditcommunityMemberProfileController";
import { RedditcommunityPlatformadminAnalyticsPostsController } from "./controllers/redditCommunity/platformAdmin/analytics/posts/RedditcommunityPlatformadminAnalyticsPostsController";
import { RedditcommunityPlatformadminBansController } from "./controllers/redditCommunity/platformAdmin/bans/RedditcommunityPlatformadminBansController";
import { RedditcommunityPlatformadminCommunitiesController } from "./controllers/redditCommunity/platformAdmin/communities/RedditcommunityPlatformadminCommunitiesController";
import { RedditcommunityPlatformadminCommunitiesBansController } from "./controllers/redditCommunity/platformAdmin/communities/bans/RedditcommunityPlatformadminCommunitiesBansController";
import { RedditcommunityPlatformadminCommunitiesReportsController } from "./controllers/redditCommunity/platformAdmin/communities/reports/RedditcommunityPlatformadminCommunitiesReportsController";
import { RedditcommunityPlatformadminModeration_actionsController } from "./controllers/redditCommunity/platformAdmin/moderation-actions/RedditcommunityPlatformadminModeration_actionsController";
import { RedditcommunityPlatformadminPostsController } from "./controllers/redditCommunity/platformAdmin/posts/RedditcommunityPlatformadminPostsController";
import { RedditcommunityPlatformadminReportsController } from "./controllers/redditCommunity/platformAdmin/reports/RedditcommunityPlatformadminReportsController";
import { RedditcommunityPopularController } from "./controllers/redditCommunity/popular/RedditcommunityPopularController";
import { RedditcommunityPostsController } from "./controllers/redditCommunity/posts/RedditcommunityPostsController";
import { RedditcommunitySystem_health_logsController } from "./controllers/redditCommunity/system-health-logs/RedditcommunitySystem_health_logsController";
import { RedditcommunitySystem_notificationsController } from "./controllers/redditCommunity/system-notifications/RedditcommunitySystem_notificationsController";

@Module({
  controllers: [
    RedditcommunityAuthGuestController,
    RedditcommunityAuthMemberController,
    RedditcommunityAuthCommunityownerController,
    RedditcommunityAuthCommunitymoderatorController,
    RedditcommunityAuthPlatformadminController,
    RedditcommunityMemberProfileController,
    RedditcommunityCommunitiesController,
    RedditcommunityCommunityownerCommunitiesController,
    RedditcommunityMemberCommunitiesController,
    RedditcommunityPostsController,
    RedditcommunityMemberPostsController,
    RedditcommunityCommunityownerPostsController,
    RedditcommunityCommunitymoderatorPostsController,
    RedditcommunityPlatformadminPostsController,
    RedditcommunityCommunityownerBansController,
    RedditcommunityCommunitymoderatorBansController,
    RedditcommunityPlatformadminBansController,
    RedditcommunityCommunityownerCommunitiesBansController,
    RedditcommunityCommunitymoderatorCommunitiesBansController,
    RedditcommunityPlatformadminCommunitiesBansController,
    RedditcommunityCommunitymoderatorModeration_actionsController,
    RedditcommunityCommunityownerModeration_actionsController,
    RedditcommunityPlatformadminModeration_actionsController,
    RedditcommunityCommunitymoderatorReportsController,
    RedditcommunityCommunityownerReportsController,
    RedditcommunityPlatformadminReportsController,
    RedditcommunityMemberHomeController,
    RedditcommunityPopularController,
    RedditcommunityFeedsController,
    RedditcommunityAudit_logsController,
    RedditcommunityAudit_logsDetailsController,
    RedditcommunityAudit_log_detailsController,
    RedditcommunitySystem_notificationsController,
    RedditcommunitySystem_health_logsController,
    RedditcommunityMaterialized_view_schedulesController,
    RedditcommunityGuestCommunitiesController,
    RedditcommunityCommunitymoderatorCommunitiesController,
    RedditcommunityPlatformadminCommunitiesController,
    RedditcommunityCommunityownerAnalyticsPostsController,
    RedditcommunityCommunitymoderatorAnalyticsPostsController,
    RedditcommunityPlatformadminAnalyticsPostsController,
    RedditcommunityCommunitymoderatorCommunitiesReportsController,
    RedditcommunityPlatformadminCommunitiesReportsController,
  ],
})
export class MyModule {}
