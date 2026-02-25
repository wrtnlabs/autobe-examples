import { Module } from "@nestjs/common";

import { RedditcommunityAnalyticsPostsPopularController } from "./controllers/redditCommunity/analytics/posts/popular/RedditcommunityAnalyticsPostsPopularController";
import { RedditcommunityAuthCommunity_ownerController } from "./controllers/redditCommunity/auth/community-owner/RedditcommunityAuthCommunity_ownerController";
import { RedditcommunityAuthCommunitymoderatorController } from "./controllers/redditCommunity/auth/communityModerator/RedditcommunityAuthCommunitymoderatorController";
import { RedditcommunityAuthGuestController } from "./controllers/redditCommunity/auth/guest/RedditcommunityAuthGuestController";
import { RedditcommunityAuthMemberController } from "./controllers/redditCommunity/auth/member/RedditcommunityAuthMemberController";
import { RedditcommunityAuthPlatformadminController } from "./controllers/redditCommunity/auth/platformAdmin/RedditcommunityAuthPlatformadminController";
import { RedditcommunityCommunitiesController } from "./controllers/redditCommunity/communities/RedditcommunityCommunitiesController";
import { RedditcommunityCommunitiesFeedsController } from "./controllers/redditCommunity/communities/feeds/RedditcommunityCommunitiesFeedsController";
import { RedditcommunityCommunitiesModeratorsController } from "./controllers/redditCommunity/communities/moderators/RedditcommunityCommunitiesModeratorsController";
import { RedditcommunityCommunitiesSubscribersController } from "./controllers/redditCommunity/communities/subscribers/RedditcommunityCommunitiesSubscribersController";
import { RedditcommunityCommunitymoderatorBansController } from "./controllers/redditCommunity/communityModerator/bans/RedditcommunityCommunitymoderatorBansController";
import { RedditcommunityCommunitymoderatorCommunitiesAnalyticsPostsController } from "./controllers/redditCommunity/communityModerator/communities/analytics/posts/RedditcommunityCommunitymoderatorCommunitiesAnalyticsPostsController";
import { RedditcommunityCommunitymoderatorCommunitiesBansController } from "./controllers/redditCommunity/communityModerator/communities/bans/RedditcommunityCommunitymoderatorCommunitiesBansController";
import { RedditcommunityCommunitymoderatorCommunitiesModeratorsController } from "./controllers/redditCommunity/communityModerator/communities/moderators/RedditcommunityCommunitymoderatorCommunitiesModeratorsController";
import { RedditcommunityCommunitymoderatorCommunitiesReportsController } from "./controllers/redditCommunity/communityModerator/communities/reports/RedditcommunityCommunitymoderatorCommunitiesReportsController";
import { RedditcommunityCommunitymoderatorCommunitiesSearchController } from "./controllers/redditCommunity/communityModerator/communities/search/RedditcommunityCommunitymoderatorCommunitiesSearchController";
import { RedditcommunityCommunitymoderatorModeratorsController } from "./controllers/redditCommunity/communityModerator/moderators/RedditcommunityCommunitymoderatorModeratorsController";
import { RedditcommunityCommunitymoderatorPostsController } from "./controllers/redditCommunity/communityModerator/posts/RedditcommunityCommunitymoderatorPostsController";
import { RedditcommunityCommunitymoderatorPostsCommentsController } from "./controllers/redditCommunity/communityModerator/posts/comments/RedditcommunityCommunitymoderatorPostsCommentsController";
import { RedditcommunityCommunitymoderatorPostsCommentsVotesController } from "./controllers/redditCommunity/communityModerator/posts/comments/votes/RedditcommunityCommunitymoderatorPostsCommentsVotesController";
import { RedditcommunityCommunitymoderatorReportsController } from "./controllers/redditCommunity/communityModerator/reports/RedditcommunityCommunitymoderatorReportsController";
import { RedditcommunityCommunityownerBansController } from "./controllers/redditCommunity/communityOwner/bans/RedditcommunityCommunityownerBansController";
import { RedditcommunityCommunityownerCommunitiesController } from "./controllers/redditCommunity/communityOwner/communities/RedditcommunityCommunityownerCommunitiesController";
import { RedditcommunityCommunityownerCommunitiesAnalyticsPostsController } from "./controllers/redditCommunity/communityOwner/communities/analytics/posts/RedditcommunityCommunityownerCommunitiesAnalyticsPostsController";
import { RedditcommunityCommunityownerCommunitiesBansController } from "./controllers/redditCommunity/communityOwner/communities/bans/RedditcommunityCommunityownerCommunitiesBansController";
import { RedditcommunityCommunityownerCommunitiesModeratorsController } from "./controllers/redditCommunity/communityOwner/communities/moderators/RedditcommunityCommunityownerCommunitiesModeratorsController";
import { RedditcommunityCommunityownerCommunitiesReportsController } from "./controllers/redditCommunity/communityOwner/communities/reports/RedditcommunityCommunityownerCommunitiesReportsController";
import { RedditcommunityCommunityownerCommunitiesSearchController } from "./controllers/redditCommunity/communityOwner/communities/search/RedditcommunityCommunityownerCommunitiesSearchController";
import { RedditcommunityCommunityownerModeratorsController } from "./controllers/redditCommunity/communityOwner/moderators/RedditcommunityCommunityownerModeratorsController";
import { RedditcommunityCommunityownerPostsCommentsController } from "./controllers/redditCommunity/communityOwner/posts/comments/RedditcommunityCommunityownerPostsCommentsController";
import { RedditcommunityCommunityownerPostsCommentsVotesController } from "./controllers/redditCommunity/communityOwner/posts/comments/votes/RedditcommunityCommunityownerPostsCommentsVotesController";
import { RedditcommunityCommunityownerReportsController } from "./controllers/redditCommunity/communityOwner/reports/RedditcommunityCommunityownerReportsController";
import { RedditcommunityFeedPopularController } from "./controllers/redditCommunity/feed/popular/RedditcommunityFeedPopularController";
import { RedditcommunityFeedsPopularController } from "./controllers/redditCommunity/feeds/popular/RedditcommunityFeedsPopularController";
import { RedditcommunityMemberController } from "./controllers/redditCommunity/member/RedditcommunityMemberController";
import { RedditcommunityMemberAnalyticsPostsController } from "./controllers/redditCommunity/member/analytics/posts/RedditcommunityMemberAnalyticsPostsController";
import { RedditcommunityMemberCommentsController } from "./controllers/redditCommunity/member/comments/RedditcommunityMemberCommentsController";
import { RedditcommunityMemberCommunitiesController } from "./controllers/redditCommunity/member/communities/RedditcommunityMemberCommunitiesController";
import { RedditcommunityMemberCommunitiesSearchController } from "./controllers/redditCommunity/member/communities/search/RedditcommunityMemberCommunitiesSearchController";
import { RedditcommunityMemberCommunitiesSubscribeController } from "./controllers/redditCommunity/member/communities/subscribe/RedditcommunityMemberCommunitiesSubscribeController";
import { RedditcommunityMemberCommunitySubscribedController } from "./controllers/redditCommunity/member/community/subscribed/RedditcommunityMemberCommunitySubscribedController";
import { RedditcommunityMemberFeedHomeController } from "./controllers/redditCommunity/member/feed/home/RedditcommunityMemberFeedHomeController";
import { RedditcommunityMemberFeedsHomeController } from "./controllers/redditCommunity/member/feeds/home/RedditcommunityMemberFeedsHomeController";
import { RedditcommunityMemberPostsController } from "./controllers/redditCommunity/member/posts/RedditcommunityMemberPostsController";
import { RedditcommunityMemberPostsCommentsController } from "./controllers/redditCommunity/member/posts/comments/RedditcommunityMemberPostsCommentsController";
import { RedditcommunityMemberPostsCommentsVotesController } from "./controllers/redditCommunity/member/posts/comments/votes/RedditcommunityMemberPostsCommentsVotesController";
import { RedditcommunityMemberProfileController } from "./controllers/redditCommunity/member/profile/RedditcommunityMemberProfileController";
import { RedditcommunityMemberReportsController } from "./controllers/redditCommunity/member/reports/RedditcommunityMemberReportsController";
import { RedditcommunityMemberSubscriptionsController } from "./controllers/redditCommunity/member/subscriptions/RedditcommunityMemberSubscriptionsController";
import { RedditcommunityPlatformadminAdminReportsController } from "./controllers/redditCommunity/platformAdmin/admin/reports/RedditcommunityPlatformadminAdminReportsController";
import { RedditcommunityPlatformadminAdminReportsAnalyticsController } from "./controllers/redditCommunity/platformAdmin/admin/reports/analytics/RedditcommunityPlatformadminAdminReportsAnalyticsController";
import { RedditcommunityPlatformadminCommunitiesAnalyticsPostsController } from "./controllers/redditCommunity/platformAdmin/communities/analytics/posts/RedditcommunityPlatformadminCommunitiesAnalyticsPostsController";
import { RedditcommunityPlatformadminCommunitiesReportsController } from "./controllers/redditCommunity/platformAdmin/communities/reports/RedditcommunityPlatformadminCommunitiesReportsController";
import { RedditcommunityPlatformadminCommunity_moderatorsController } from "./controllers/redditCommunity/platformAdmin/community-moderators/RedditcommunityPlatformadminCommunity_moderatorsController";
import { RedditcommunityPlatformadminCommunity_ownersController } from "./controllers/redditCommunity/platformAdmin/community-owners/RedditcommunityPlatformadminCommunity_ownersController";
import { RedditcommunityPlatformadminMembersController } from "./controllers/redditCommunity/platformAdmin/members/RedditcommunityPlatformadminMembersController";
import { RedditcommunityPlatformadminPlatform_adminsController } from "./controllers/redditCommunity/platformAdmin/platform-admins/RedditcommunityPlatformadminPlatform_adminsController";
import { RedditcommunityPlatformadminPostsController } from "./controllers/redditCommunity/platformAdmin/posts/RedditcommunityPlatformadminPostsController";
import { RedditcommunityPlatformadminPostsCommentsController } from "./controllers/redditCommunity/platformAdmin/posts/comments/RedditcommunityPlatformadminPostsCommentsController";
import { RedditcommunityPlatformadminPostsCommentsVotesController } from "./controllers/redditCommunity/platformAdmin/posts/comments/votes/RedditcommunityPlatformadminPostsCommentsVotesController";
import { RedditcommunityPlatformadminReportsController } from "./controllers/redditCommunity/platformAdmin/reports/RedditcommunityPlatformadminReportsController";
import { RedditcommunityPlatformadminReportsApproveController } from "./controllers/redditCommunity/platformAdmin/reports/approve/RedditcommunityPlatformadminReportsApproveController";
import { RedditcommunityPlatformadminReportsDismissController } from "./controllers/redditCommunity/platformAdmin/reports/dismiss/RedditcommunityPlatformadminReportsDismissController";
import { RedditcommunityPlatformadminUsersController } from "./controllers/redditCommunity/platformAdmin/users/RedditcommunityPlatformadminUsersController";
import { RedditcommunityPlatformadminUsersMetricsController } from "./controllers/redditCommunity/platformAdmin/users/metrics/RedditcommunityPlatformadminUsersMetricsController";
import { RedditcommunityPlatformadminUsersSearchController } from "./controllers/redditCommunity/platformAdmin/users/search/RedditcommunityPlatformadminUsersSearchController";
import { RedditcommunityPlatformadminUsersSummaryController } from "./controllers/redditCommunity/platformAdmin/users/summary/RedditcommunityPlatformadminUsersSummaryController";
import { RedditcommunityPostsController } from "./controllers/redditCommunity/posts/RedditcommunityPostsController";
import { RedditcommunityPostsCommentsController } from "./controllers/redditCommunity/posts/comments/RedditcommunityPostsCommentsController";
import { RedditcommunityProfilesController } from "./controllers/redditCommunity/profiles/RedditcommunityProfilesController";
import { RedditcommunityUsersController } from "./controllers/redditCommunity/users/RedditcommunityUsersController";

@Module({
  controllers: [
    RedditcommunityAuthGuestController,
    RedditcommunityAuthMemberController,
    RedditcommunityAuthCommunity_ownerController,
    RedditcommunityAuthCommunitymoderatorController,
    RedditcommunityAuthPlatformadminController,
    RedditcommunityMemberController,
    RedditcommunityProfilesController,
    RedditcommunityUsersController,
    RedditcommunityMemberPostsController,
    RedditcommunityMemberCommentsController,
    RedditcommunityMemberCommunitiesSubscribeController,
    RedditcommunityMemberSubscriptionsController,
    RedditcommunityCommunityownerCommunitiesController,
    RedditcommunityCommunitiesModeratorsController,
    RedditcommunityCommunitiesSubscribersController,
    RedditcommunityCommunitiesController,
    RedditcommunityMemberCommunitiesController,
    RedditcommunityCommunityownerCommunitiesModeratorsController,
    RedditcommunityPostsController,
    RedditcommunityCommunitymoderatorPostsController,
    RedditcommunityPlatformadminPostsController,
    RedditcommunityMemberPostsCommentsController,
    RedditcommunityPostsCommentsController,
    RedditcommunityCommunitymoderatorPostsCommentsController,
    RedditcommunityCommunityownerPostsCommentsController,
    RedditcommunityPlatformadminPostsCommentsController,
    RedditcommunityMemberPostsCommentsVotesController,
    RedditcommunityCommunitymoderatorPostsCommentsVotesController,
    RedditcommunityCommunityownerPostsCommentsVotesController,
    RedditcommunityPlatformadminPostsCommentsVotesController,
    RedditcommunityMemberFeedHomeController,
    RedditcommunityFeedPopularController,
    RedditcommunityCommunitymoderatorCommunitiesModeratorsController,
    RedditcommunityCommunityownerModeratorsController,
    RedditcommunityCommunitymoderatorModeratorsController,
    RedditcommunityCommunityownerCommunitiesBansController,
    RedditcommunityCommunitymoderatorCommunitiesBansController,
    RedditcommunityCommunityownerBansController,
    RedditcommunityCommunitymoderatorBansController,
    RedditcommunityCommunityownerReportsController,
    RedditcommunityCommunitymoderatorReportsController,
    RedditcommunityPlatformadminReportsApproveController,
    RedditcommunityCommunityownerCommunitiesReportsController,
    RedditcommunityCommunitymoderatorCommunitiesReportsController,
    RedditcommunityPlatformadminCommunitiesReportsController,
    RedditcommunityMemberReportsController,
    RedditcommunityPlatformadminReportsController,
    RedditcommunityPlatformadminReportsDismissController,
    RedditcommunityPlatformadminMembersController,
    RedditcommunityPlatformadminUsersController,
    RedditcommunityPlatformadminCommunity_ownersController,
    RedditcommunityPlatformadminCommunity_moderatorsController,
    RedditcommunityPlatformadminPlatform_adminsController,
    RedditcommunityMemberProfileController,
    RedditcommunityMemberCommunitiesSearchController,
    RedditcommunityCommunityownerCommunitiesSearchController,
    RedditcommunityCommunitymoderatorCommunitiesSearchController,
    RedditcommunityMemberCommunitySubscribedController,
    RedditcommunityMemberAnalyticsPostsController,
    RedditcommunityCommunityownerCommunitiesAnalyticsPostsController,
    RedditcommunityCommunitymoderatorCommunitiesAnalyticsPostsController,
    RedditcommunityPlatformadminCommunitiesAnalyticsPostsController,
    RedditcommunityAnalyticsPostsPopularController,
    RedditcommunityMemberFeedsHomeController,
    RedditcommunityFeedsPopularController,
    RedditcommunityCommunitiesFeedsController,
    RedditcommunityPlatformadminAdminReportsController,
    RedditcommunityPlatformadminAdminReportsAnalyticsController,
    RedditcommunityPlatformadminUsersSearchController,
    RedditcommunityPlatformadminUsersSummaryController,
    RedditcommunityPlatformadminUsersMetricsController,
  ],
})
export class MyModule {}
