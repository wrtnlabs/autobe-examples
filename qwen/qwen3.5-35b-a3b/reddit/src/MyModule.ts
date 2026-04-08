import { Module } from "@nestjs/common";

import { RedditcommunityAdminAdminsController } from "./controllers/redditCommunity/admin/admins/RedditcommunityAdminAdminsController";
import { RedditcommunityAdminBansController } from "./controllers/redditCommunity/admin/bans/RedditcommunityAdminBansController";
import { RedditcommunityAdminCommunitiesController } from "./controllers/redditCommunity/admin/communities/RedditcommunityAdminCommunitiesController";
import { RedditcommunityAdminCommunitiesFilesController } from "./controllers/redditCommunity/admin/communities/files/RedditcommunityAdminCommunitiesFilesController";
import { RedditcommunityAdminCommunitiesReportsController } from "./controllers/redditCommunity/admin/communities/reports/RedditcommunityAdminCommunitiesReportsController";
import { RedditcommunityAdminMembersPortfolioController } from "./controllers/redditCommunity/admin/members/portfolio/RedditcommunityAdminMembersPortfolioController";
import { RedditcommunityAdminModerator_rolesController } from "./controllers/redditCommunity/admin/moderator-roles/RedditcommunityAdminModerator_rolesController";
import { RedditcommunityAdminPostsCommentsReportsController } from "./controllers/redditCommunity/admin/posts/comments/reports/RedditcommunityAdminPostsCommentsReportsController";
import { RedditcommunityAdminPostsReportsController } from "./controllers/redditCommunity/admin/posts/reports/RedditcommunityAdminPostsReportsController";
import { RedditcommunityAdminReport_resolutionsController } from "./controllers/redditCommunity/admin/report-resolutions/RedditcommunityAdminReport_resolutionsController";
import { RedditcommunityAdminReportsController } from "./controllers/redditCommunity/admin/reports/RedditcommunityAdminReportsController";
import { RedditcommunityAdminReportsOverviewController } from "./controllers/redditCommunity/admin/reports/overview/RedditcommunityAdminReportsOverviewController";
import { RedditcommunityAdminSnapshotsController } from "./controllers/redditCommunity/admin/snapshots/RedditcommunityAdminSnapshotsController";
import { RedditcommunityAdminSubscriptionsSnapshotsController } from "./controllers/redditCommunity/admin/subscriptions/snapshots/RedditcommunityAdminSubscriptionsSnapshotsController";
import { RedditcommunityAuthAdminController } from "./controllers/redditCommunity/auth/admin/RedditcommunityAuthAdminController";
import { RedditcommunityAuthGuestController } from "./controllers/redditCommunity/auth/guest/RedditcommunityAuthGuestController";
import { RedditcommunityAuthMemberController } from "./controllers/redditCommunity/auth/member/RedditcommunityAuthMemberController";
import { RedditcommunityGuestBrowse_communitiesController } from "./controllers/redditCommunity/guest/browse-communities/RedditcommunityGuestBrowse_communitiesController";
import { RedditcommunityGuestCommunitiesController } from "./controllers/redditCommunity/guest/communities/RedditcommunityGuestCommunitiesController";
import { RedditcommunityGuestCommunitiesStatsController } from "./controllers/redditCommunity/guest/communities/stats/RedditcommunityGuestCommunitiesStatsController";
import { RedditcommunityGuestFeedsCommunityController } from "./controllers/redditCommunity/guest/feeds/community/RedditcommunityGuestFeedsCommunityController";
import { RedditcommunityGuestFeedsPopularController } from "./controllers/redditCommunity/guest/feeds/popular/RedditcommunityGuestFeedsPopularController";
import { RedditcommunityGuestMembersPortfolioController } from "./controllers/redditCommunity/guest/members/portfolio/RedditcommunityGuestMembersPortfolioController";
import { RedditcommunityGuestPostsDetailsController } from "./controllers/redditCommunity/guest/posts/details/RedditcommunityGuestPostsDetailsController";
import { RedditcommunityGuestsController } from "./controllers/redditCommunity/guests/RedditcommunityGuestsController";
import { RedditcommunityMemberBrowse_communitiesController } from "./controllers/redditCommunity/member/browse-communities/RedditcommunityMemberBrowse_communitiesController";
import { RedditcommunityMemberCommunitiesController } from "./controllers/redditCommunity/member/communities/RedditcommunityMemberCommunitiesController";
import { RedditcommunityMemberCommunitiesDelete_confirmationController } from "./controllers/redditCommunity/member/communities/delete-confirmation/RedditcommunityMemberCommunitiesDelete_confirmationController";
import { RedditcommunityMemberCommunitiesStatsController } from "./controllers/redditCommunity/member/communities/stats/RedditcommunityMemberCommunitiesStatsController";
import { RedditcommunityMemberEmail_verificationsController } from "./controllers/redditCommunity/member/email-verifications/RedditcommunityMemberEmail_verificationsController";
import { RedditcommunityMemberFeedsCommunityController } from "./controllers/redditCommunity/member/feeds/community/RedditcommunityMemberFeedsCommunityController";
import { RedditcommunityMemberFeedsHomeController } from "./controllers/redditCommunity/member/feeds/home/RedditcommunityMemberFeedsHomeController";
import { RedditcommunityMemberFeedsPopularController } from "./controllers/redditCommunity/member/feeds/popular/RedditcommunityMemberFeedsPopularController";
import { RedditcommunityMemberHome_feedController } from "./controllers/redditCommunity/member/home-feed/RedditcommunityMemberHome_feedController";
import { RedditcommunityMemberMembersPortfolioController } from "./controllers/redditCommunity/member/members/portfolio/RedditcommunityMemberMembersPortfolioController";
import { RedditcommunityMemberPassword_resetsController } from "./controllers/redditCommunity/member/password-resets/RedditcommunityMemberPassword_resetsController";
import { RedditcommunityMemberPostsController } from "./controllers/redditCommunity/member/posts/RedditcommunityMemberPostsController";
import { RedditcommunityMemberPostsCommentsController } from "./controllers/redditCommunity/member/posts/comments/RedditcommunityMemberPostsCommentsController";
import { RedditcommunityMemberPostsCommentsReportsController } from "./controllers/redditCommunity/member/posts/comments/reports/RedditcommunityMemberPostsCommentsReportsController";
import { RedditcommunityMemberPostsCommentsVotesController } from "./controllers/redditCommunity/member/posts/comments/votes/RedditcommunityMemberPostsCommentsVotesController";
import { RedditcommunityMemberPostsDetailsController } from "./controllers/redditCommunity/member/posts/details/RedditcommunityMemberPostsDetailsController";
import { RedditcommunityMemberPostsReportsController } from "./controllers/redditCommunity/member/posts/reports/RedditcommunityMemberPostsReportsController";
import { RedditcommunityMemberPostsVotesController } from "./controllers/redditCommunity/member/posts/votes/RedditcommunityMemberPostsVotesController";
import { RedditcommunityMemberProfileController } from "./controllers/redditCommunity/member/profile/RedditcommunityMemberProfileController";
import { RedditcommunityMemberSessionsController } from "./controllers/redditCommunity/member/sessions/RedditcommunityMemberSessionsController";
import { RedditcommunityMemberSubscriptionsController } from "./controllers/redditCommunity/member/subscriptions/RedditcommunityMemberSubscriptionsController";
import { RedditcommunityMemberSubscriptionsSnapshotsController } from "./controllers/redditCommunity/member/subscriptions/snapshots/RedditcommunityMemberSubscriptionsSnapshotsController";
import { RedditcommunityMembersController } from "./controllers/redditCommunity/members/RedditcommunityMembersController";
import { RedditcommunityPostsController } from "./controllers/redditCommunity/posts/RedditcommunityPostsController";
import { RedditcommunityPostsCommentsController } from "./controllers/redditCommunity/posts/comments/RedditcommunityPostsCommentsController";
import { RedditcommunityPostsFilesController } from "./controllers/redditCommunity/posts/files/RedditcommunityPostsFilesController";
import { RedditcommunityPostsSnapshotsController } from "./controllers/redditCommunity/posts/snapshots/RedditcommunityPostsSnapshotsController";

@Module({
  controllers: [
    RedditcommunityAuthGuestController,
    RedditcommunityAuthMemberController,
    RedditcommunityAuthAdminController,
    RedditcommunityGuestsController,
    RedditcommunityMembersController,
    RedditcommunityMemberProfileController,
    RedditcommunityAdminAdminsController,
    RedditcommunityMemberSessionsController,
    RedditcommunityMemberPassword_resetsController,
    RedditcommunityMemberEmail_verificationsController,
    RedditcommunityGuestCommunitiesController,
    RedditcommunityMemberCommunitiesController,
    RedditcommunityAdminCommunitiesController,
    RedditcommunityAdminCommunitiesFilesController,
    RedditcommunityAdminSnapshotsController,
    RedditcommunityMemberSubscriptionsController,
    RedditcommunityMemberSubscriptionsSnapshotsController,
    RedditcommunityAdminSubscriptionsSnapshotsController,
    RedditcommunityPostsController,
    RedditcommunityMemberPostsController,
    RedditcommunityPostsCommentsController,
    RedditcommunityMemberPostsCommentsController,
    RedditcommunityMemberPostsVotesController,
    RedditcommunityMemberPostsCommentsVotesController,
    RedditcommunityPostsFilesController,
    RedditcommunityPostsSnapshotsController,
    RedditcommunityMemberPostsReportsController,
    RedditcommunityAdminPostsReportsController,
    RedditcommunityMemberPostsCommentsReportsController,
    RedditcommunityAdminPostsCommentsReportsController,
    RedditcommunityAdminModerator_rolesController,
    RedditcommunityAdminBansController,
    RedditcommunityAdminReportsController,
    RedditcommunityAdminReport_resolutionsController,
    RedditcommunityMemberHome_feedController,
    RedditcommunityGuestBrowse_communitiesController,
    RedditcommunityMemberBrowse_communitiesController,
    RedditcommunityMemberCommunitiesDelete_confirmationController,
    RedditcommunityAdminCommunitiesReportsController,
    RedditcommunityGuestCommunitiesStatsController,
    RedditcommunityMemberCommunitiesStatsController,
    RedditcommunityMemberFeedsHomeController,
    RedditcommunityGuestFeedsPopularController,
    RedditcommunityMemberFeedsPopularController,
    RedditcommunityGuestFeedsCommunityController,
    RedditcommunityMemberFeedsCommunityController,
    RedditcommunityGuestMembersPortfolioController,
    RedditcommunityMemberMembersPortfolioController,
    RedditcommunityAdminMembersPortfolioController,
    RedditcommunityGuestPostsDetailsController,
    RedditcommunityMemberPostsDetailsController,
    RedditcommunityAdminReportsOverviewController,
  ],
})
export class MyModule {}
