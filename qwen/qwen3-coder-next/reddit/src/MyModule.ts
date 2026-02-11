import { Module } from "@nestjs/common";

import { RedditplatformAdminAnalyticsController } from "./controllers/redditPlatform/admin/analytics/realtime/RedditplatformAdminAnalyticsController";
import { RedditplatformAdminCommunitiesAnalyticsController } from "./controllers/redditPlatform/admin/communities/analytics/RedditplatformAdminCommunitiesAnalyticsController";
import { RedditplatformAdminCommunitiesBanned_usersController } from "./controllers/redditPlatform/admin/communities/banned-users/RedditplatformAdminCommunitiesBanned_usersController";
import { RedditplatformAdminCommunitiesBansController } from "./controllers/redditPlatform/admin/communities/bans/RedditplatformAdminCommunitiesBansController";
import { RedditplatformAdminCommunitiesController } from "./controllers/redditPlatform/admin/communities/engagement/RedditplatformAdminCommunitiesController";
import { RedditplatformAdminCommunitiesModeratorsController } from "./controllers/redditPlatform/admin/communities/moderators/RedditplatformAdminCommunitiesModeratorsController";
import { RedditplatformAdminCommunitiesReportsController } from "./controllers/redditPlatform/admin/communities/reports/RedditplatformAdminCommunitiesReportsController";
import { RedditplatformAdminRedditplatformBansController } from "./controllers/redditPlatform/admin/redditPlatform/bans/RedditplatformAdminRedditplatformBansController";
import { RedditplatformAdminRedditplatformCommunitiesUsersBansController } from "./controllers/redditPlatform/admin/redditPlatform/communities/users/bans/RedditplatformAdminRedditplatformCommunitiesUsersBansController";
import { RedditplatformAdminRedditplatformModerationsController } from "./controllers/redditPlatform/admin/redditPlatform/moderations/RedditplatformAdminRedditplatformModerationsController";
import { RedditplatformAdminRedditplatformReportresolutionsController } from "./controllers/redditPlatform/admin/redditPlatform/reportResolutions/RedditplatformAdminRedditplatformReportresolutionsController";
import { RedditplatformAdminRedditplatformReportsController } from "./controllers/redditPlatform/admin/redditPlatform/reports/RedditplatformAdminRedditplatformReportsController";
import { RedditplatformAdminRedditplatformReportsResolutionsController } from "./controllers/redditPlatform/admin/redditPlatform/reports/resolutions/RedditplatformAdminRedditplatformReportsResolutionsController";
import { RedditplatformAdminReportresolutionsController } from "./controllers/redditPlatform/admin/reportResolutions/RedditplatformAdminReportresolutionsController";
import { RedditplatformAdminSystem_configsController } from "./controllers/redditPlatform/admin/system-configs/RedditplatformAdminSystem_configsController";
import { RedditplatformAdminSystem_configsBulkController } from "./controllers/redditPlatform/admin/system-configs/bulk/RedditplatformAdminSystem_configsBulkController";
import { RedditplatformAdminsController } from "./controllers/redditPlatform/admins/RedditplatformAdminsController";
import { RedditplatformAuthAdminController } from "./controllers/redditPlatform/auth/admin/RedditplatformAuthAdminController";
import { RedditplatformAuthGuestController } from "./controllers/redditPlatform/auth/guest/RedditplatformAuthGuestController";
import { RedditplatformAuthMemberController } from "./controllers/redditPlatform/auth/member/RedditplatformAuthMemberController";
import { RedditplatformCommunitiesController } from "./controllers/redditPlatform/communities/RedditplatformCommunitiesController";
import { RedditplatformCommunitiesFeedController } from "./controllers/redditPlatform/communities/feed/RedditplatformCommunitiesFeedController";
import { RedditplatformCommunity_viewsController } from "./controllers/redditPlatform/community-views/RedditplatformCommunity_viewsController";
import { RedditplatformHot_scoresController } from "./controllers/redditPlatform/hot-scores/RedditplatformHot_scoresController";
import { RedditplatformMemberComment_votesController } from "./controllers/redditPlatform/member/comment-votes/RedditplatformMemberComment_votesController";
import { RedditplatformMemberCommunitiesController } from "./controllers/redditPlatform/member/communities/RedditplatformMemberCommunitiesController";
import { RedditplatformMemberCommunitiesAnalyticsController } from "./controllers/redditPlatform/member/communities/analytics/RedditplatformMemberCommunitiesAnalyticsController";
import { RedditplatformMemberCommunitiesSubscribersController } from "./controllers/redditPlatform/member/communities/subscribers/RedditplatformMemberCommunitiesSubscribersController";
import { RedditplatformMemberCommunitiesSubscriptionsController } from "./controllers/redditPlatform/member/communities/subscriptions/RedditplatformMemberCommunitiesSubscriptionsController";
import { RedditplatformMemberHomeController } from "./controllers/redditPlatform/member/home/RedditplatformMemberHomeController";
import { RedditplatformMemberPostsController } from "./controllers/redditPlatform/member/posts/RedditplatformMemberPostsController";
import { RedditplatformMemberPostsCommentsController } from "./controllers/redditPlatform/member/posts/comments/RedditplatformMemberPostsCommentsController";
import { RedditplatformMemberPostsCommentsVotesController } from "./controllers/redditPlatform/member/posts/comments/votes/RedditplatformMemberPostsCommentsVotesController";
import { RedditplatformMemberPostsVotesController } from "./controllers/redditPlatform/member/posts/votes/RedditplatformMemberPostsVotesController";
import { RedditplatformMemberPreferencesController } from "./controllers/redditPlatform/member/preferences/RedditplatformMemberPreferencesController";
import { RedditplatformMemberPreferencesMyController } from "./controllers/redditPlatform/member/preferences/my/RedditplatformMemberPreferencesMyController";
import { RedditplatformMemberRedditplatformBansController } from "./controllers/redditPlatform/member/redditPlatform/bans/RedditplatformMemberRedditplatformBansController";
import { RedditplatformMemberRedditplatformCommunitiesUsersBansController } from "./controllers/redditPlatform/member/redditPlatform/communities/users/bans/RedditplatformMemberRedditplatformCommunitiesUsersBansController";
import { RedditplatformMemberRedditplatformModerationsController } from "./controllers/redditPlatform/member/redditPlatform/moderations/RedditplatformMemberRedditplatformModerationsController";
import { RedditplatformMemberRedditplatformReportresolutionsController } from "./controllers/redditPlatform/member/redditPlatform/reportResolutions/RedditplatformMemberRedditplatformReportresolutionsController";
import { RedditplatformMemberRedditplatformReportsController } from "./controllers/redditPlatform/member/redditPlatform/reports/RedditplatformMemberRedditplatformReportsController";
import { RedditplatformMemberRedditplatformReportsResolutionsController } from "./controllers/redditPlatform/member/redditPlatform/reports/resolutions/RedditplatformMemberRedditplatformReportsResolutionsController";
import { RedditplatformMemberSubscriptionsController } from "./controllers/redditPlatform/member/subscriptions/RedditplatformMemberSubscriptionsController";
import { RedditplatformMemberVotesController } from "./controllers/redditPlatform/member/votes/RedditplatformMemberVotesController";
import { RedditplatformMembersController } from "./controllers/redditPlatform/members/RedditplatformMembersController";
import { RedditplatformPopular_cacheController } from "./controllers/redditPlatform/popular-cache/RedditplatformPopular_cacheController";
import { RedditplatformPopularController } from "./controllers/redditPlatform/popular/RedditplatformPopularController";
import { RedditplatformPostsController } from "./controllers/redditPlatform/posts/RedditplatformPostsController";
import { RedditplatformPostsCommentsController } from "./controllers/redditPlatform/posts/comments/RedditplatformPostsCommentsController";
import { RedditplatformResultsController } from "./controllers/redditPlatform/results/RedditplatformResultsController";
import { RedditplatformSorting_cachesController } from "./controllers/redditPlatform/sorting-caches/RedditplatformSorting_cachesController";
import { RedditplatformViewsController } from "./controllers/redditPlatform/views/RedditplatformViewsController";

@Module({
  controllers: [
    RedditplatformAuthGuestController,
    RedditplatformAuthMemberController,
    RedditplatformAuthAdminController,
    RedditplatformMembersController,
    RedditplatformAdminsController,
    RedditplatformMemberCommunitiesController,
    RedditplatformMemberCommunitiesSubscriptionsController,
    RedditplatformMemberSubscriptionsController,
    RedditplatformCommunitiesController,
    RedditplatformMemberCommunitiesSubscribersController,
    RedditplatformPostsController,
    RedditplatformMemberPostsController,
    RedditplatformPostsCommentsController,
    RedditplatformMemberPostsCommentsController,
    RedditplatformMemberPostsVotesController,
    RedditplatformMemberPreferencesController,
    RedditplatformResultsController,
    RedditplatformViewsController,
    RedditplatformCommunity_viewsController,
    RedditplatformHot_scoresController,
    RedditplatformPopular_cacheController,
    RedditplatformSorting_cachesController,
    RedditplatformAdminRedditplatformCommunitiesUsersBansController,
    RedditplatformMemberRedditplatformCommunitiesUsersBansController,
    RedditplatformAdminRedditplatformBansController,
    RedditplatformMemberRedditplatformBansController,
    RedditplatformAdminRedditplatformReportsController,
    RedditplatformMemberRedditplatformReportsController,
    RedditplatformAdminRedditplatformReportsResolutionsController,
    RedditplatformMemberRedditplatformReportsResolutionsController,
    RedditplatformAdminRedditplatformReportresolutionsController,
    RedditplatformMemberRedditplatformReportresolutionsController,
    RedditplatformAdminReportresolutionsController,
    RedditplatformAdminRedditplatformModerationsController,
    RedditplatformMemberRedditplatformModerationsController,
    RedditplatformAdminSystem_configsController,
    RedditplatformAdminAnalyticsController,
    RedditplatformAdminCommunitiesController,
    RedditplatformMemberPostsCommentsVotesController,
    RedditplatformMemberVotesController,
    RedditplatformMemberComment_votesController,
    RedditplatformMemberPreferencesMyController,
    RedditplatformAdminCommunitiesAnalyticsController,
    RedditplatformMemberCommunitiesAnalyticsController,
    RedditplatformMemberHomeController,
    RedditplatformPopularController,
    RedditplatformCommunitiesFeedController,
    RedditplatformAdminCommunitiesReportsController,
    RedditplatformAdminCommunitiesBansController,
    RedditplatformAdminCommunitiesBanned_usersController,
    RedditplatformAdminCommunitiesModeratorsController,
    RedditplatformAdminSystem_configsBulkController,
  ],
})
export class MyModule {}
