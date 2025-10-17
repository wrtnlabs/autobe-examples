import { Module } from "@nestjs/common";

import { AuthGuestJoinController } from "./controllers/auth/guest/join/AuthGuestJoinController";
import { AuthGuestRefreshController } from "./controllers/auth/guest/refresh/AuthGuestRefreshController";
import { AuthMemberController } from "./controllers/auth/member/AuthMemberController";
import { AuthCommunitymoderatorJoinController } from "./controllers/auth/communityModerator/join/AuthCommunitymoderatorJoinController";
import { AuthCommunitymoderatorLoginController } from "./controllers/auth/communityModerator/login/AuthCommunitymoderatorLoginController";
import { AuthCommunitymoderatorRefreshController } from "./controllers/auth/communityModerator/refresh/AuthCommunitymoderatorRefreshController";
import { AuthAdminController } from "./controllers/auth/admin/AuthAdminController";
import { RedditcommunityAdminRedditcommunityguestsController } from "./controllers/redditCommunity/admin/redditCommunityGuests/RedditcommunityAdminRedditcommunityguestsController";
import { RedditcommunityCommunitymoderatorRedditcommunityguestsController } from "./controllers/redditCommunity/communityModerator/redditCommunityGuests/RedditcommunityCommunitymoderatorRedditcommunityguestsController";
import { RedditcommunityAdminRedditcommunitymembersController } from "./controllers/redditCommunity/admin/redditCommunityMembers/RedditcommunityAdminRedditcommunitymembersController";
import { RedditcommunityCommunitymoderatorRedditcommunitymembersController } from "./controllers/redditCommunity/communityModerator/redditCommunityMembers/RedditcommunityCommunitymoderatorRedditcommunitymembersController";
import { RedditcommunityMemberRedditcommunitymembersController } from "./controllers/redditCommunity/member/redditCommunityMembers/RedditcommunityMemberRedditcommunitymembersController";
import { RedditcommunityAdminRedditcommunitycommunitymoderatorsController } from "./controllers/redditCommunity/admin/redditCommunityCommunityModerators/RedditcommunityAdminRedditcommunitycommunitymoderatorsController";
import { RedditcommunityCommunitymoderatorRedditcommunitycommunitymoderatorsController } from "./controllers/redditCommunity/communityModerator/redditCommunityCommunityModerators/RedditcommunityCommunitymoderatorRedditcommunitycommunitymoderatorsController";
import { RedditcommunityAdminRedditcommunityadminsController } from "./controllers/redditCommunity/admin/redditCommunityAdmins/RedditcommunityAdminRedditcommunityadminsController";
import { RedditcommunityMemberCommunitiesController } from "./controllers/redditCommunity/member/communities/RedditcommunityMemberCommunitiesController";
import { RedditcommunityAdminCommunitiesController } from "./controllers/redditCommunity/admin/communities/RedditcommunityAdminCommunitiesController";
import { RedditcommunityAdminCommunitiesCommunitymoderatorsController } from "./controllers/redditCommunity/admin/communities/communityModerators/RedditcommunityAdminCommunitiesCommunitymoderatorsController";
import { RedditcommunityCommunitymoderatorCommunitiesCommunitymoderatorsController } from "./controllers/redditCommunity/communityModerator/communities/communityModerators/RedditcommunityCommunitymoderatorCommunitiesCommunitymoderatorsController";
import { RedditcommunityCommunitiesPostsController } from "./controllers/redditCommunity/communities/posts/RedditcommunityCommunitiesPostsController";
import { RedditcommunityMemberCommunitiesPostsController } from "./controllers/redditCommunity/member/communities/posts/RedditcommunityMemberCommunitiesPostsController";
import { RedditcommunityCommunitymoderatorCommunitiesPostsController } from "./controllers/redditCommunity/communityModerator/communities/posts/RedditcommunityCommunitymoderatorCommunitiesPostsController";
import { RedditcommunityAdminCommunitiesPostsController } from "./controllers/redditCommunity/admin/communities/posts/RedditcommunityAdminCommunitiesPostsController";
import { RedditcommunityMemberPostsCommentsController } from "./controllers/redditCommunity/member/posts/comments/RedditcommunityMemberPostsCommentsController";
import { RedditcommunityCommunitymoderatorPostsCommentsController } from "./controllers/redditCommunity/communityModerator/posts/comments/RedditcommunityCommunitymoderatorPostsCommentsController";
import { RedditcommunityAdminPostsCommentsController } from "./controllers/redditCommunity/admin/posts/comments/RedditcommunityAdminPostsCommentsController";
import { RedditcommunityMemberPostsPostvotesController } from "./controllers/redditCommunity/member/posts/postVotes/RedditcommunityMemberPostsPostvotesController";
import { RedditcommunityCommunitymoderatorCommentsCommentvotesController } from "./controllers/redditCommunity/communityModerator/comments/commentVotes/RedditcommunityCommunitymoderatorCommentsCommentvotesController";
import { RedditcommunityAdminCommentsCommentvotesController } from "./controllers/redditCommunity/admin/comments/commentVotes/RedditcommunityAdminCommentsCommentvotesController";
import { RedditcommunityMemberCommentsCommentvotesController } from "./controllers/redditCommunity/member/comments/commentVotes/RedditcommunityMemberCommentsCommentvotesController";
import { RedditcommunityCommunitymoderatorReportsController } from "./controllers/redditCommunity/communityModerator/reports/RedditcommunityCommunitymoderatorReportsController";
import { RedditcommunityAdminReportsController } from "./controllers/redditCommunity/admin/reports/RedditcommunityAdminReportsController";
import { RedditcommunityReportsController } from "./controllers/redditCommunity/reports/RedditcommunityReportsController";
import { RedditcommunityAdminReportsReportactionsController } from "./controllers/redditCommunity/admin/reports/reportActions/RedditcommunityAdminReportsReportactionsController";
import { RedditcommunityCommunitymoderatorReportsReportactionsController } from "./controllers/redditCommunity/communityModerator/reports/reportActions/RedditcommunityCommunitymoderatorReportsReportactionsController";
import { RedditcommunityReportstatusesController } from "./controllers/redditCommunity/reportStatuses/RedditcommunityReportstatusesController";
import { RedditcommunityAdminReportstatusesController } from "./controllers/redditCommunity/admin/reportStatuses/RedditcommunityAdminReportstatusesController";

@Module({
  controllers: [
    AuthGuestJoinController,
    AuthGuestRefreshController,
    AuthMemberController,
    AuthCommunitymoderatorJoinController,
    AuthCommunitymoderatorLoginController,
    AuthCommunitymoderatorRefreshController,
    AuthAdminController,
    RedditcommunityAdminRedditcommunityguestsController,
    RedditcommunityCommunitymoderatorRedditcommunityguestsController,
    RedditcommunityAdminRedditcommunitymembersController,
    RedditcommunityCommunitymoderatorRedditcommunitymembersController,
    RedditcommunityMemberRedditcommunitymembersController,
    RedditcommunityAdminRedditcommunitycommunitymoderatorsController,
    RedditcommunityCommunitymoderatorRedditcommunitycommunitymoderatorsController,
    RedditcommunityAdminRedditcommunityadminsController,
    RedditcommunityMemberCommunitiesController,
    RedditcommunityAdminCommunitiesController,
    RedditcommunityAdminCommunitiesCommunitymoderatorsController,
    RedditcommunityCommunitymoderatorCommunitiesCommunitymoderatorsController,
    RedditcommunityCommunitiesPostsController,
    RedditcommunityMemberCommunitiesPostsController,
    RedditcommunityCommunitymoderatorCommunitiesPostsController,
    RedditcommunityAdminCommunitiesPostsController,
    RedditcommunityMemberPostsCommentsController,
    RedditcommunityCommunitymoderatorPostsCommentsController,
    RedditcommunityAdminPostsCommentsController,
    RedditcommunityMemberPostsPostvotesController,
    RedditcommunityCommunitymoderatorCommentsCommentvotesController,
    RedditcommunityAdminCommentsCommentvotesController,
    RedditcommunityMemberCommentsCommentvotesController,
    RedditcommunityCommunitymoderatorReportsController,
    RedditcommunityAdminReportsController,
    RedditcommunityReportsController,
    RedditcommunityAdminReportsReportactionsController,
    RedditcommunityCommunitymoderatorReportsReportactionsController,
    RedditcommunityReportstatusesController,
    RedditcommunityAdminReportstatusesController,
  ],
})
export class MyModule {}
