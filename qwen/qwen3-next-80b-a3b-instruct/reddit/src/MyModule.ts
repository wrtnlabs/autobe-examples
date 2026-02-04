import { Module } from "@nestjs/common";

import { CommunityplatformAuthGuestController } from "./controllers/communityPlatform/auth/guest/CommunityplatformAuthGuestController";
import { CommunityplatformAuthMemberController } from "./controllers/communityPlatform/auth/member/CommunityplatformAuthMemberController";
import { CommunityplatformAuthModeratorController } from "./controllers/communityPlatform/auth/moderator/CommunityplatformAuthModeratorController";
import { CommunityplatformAuthOwnerController } from "./controllers/communityPlatform/auth/owner/CommunityplatformAuthOwnerController";
import { CommunityplatformCommentsThread_summaryController } from "./controllers/communityPlatform/comments/thread-summary/CommunityplatformCommentsThread_summaryController";
import { CommunityplatformCommunitiesFeedController } from "./controllers/communityPlatform/communities/feed/CommunityplatformCommunitiesFeedController";
import { CommunityplatformCommunitiesPostsControversialController } from "./controllers/communityPlatform/communities/posts/controversial/CommunityplatformCommunitiesPostsControversialController";
import { CommunityplatformCommunitiesPostsHotController } from "./controllers/communityPlatform/communities/posts/hot/CommunityplatformCommunitiesPostsHotController";
import { CommunityplatformCommunitiesPosts_newController } from "./controllers/communityPlatform/communities/posts/new/CommunityplatformCommunitiesPosts_newController";
import { CommunityplatformCommunitiesPostsTopController } from "./controllers/communityPlatform/communities/posts/top/CommunityplatformCommunitiesPostsTopController";
import { CommunityplatformCommunitiesSearchController } from "./controllers/communityPlatform/communities/search/CommunityplatformCommunitiesSearchController";
import { CommunityplatformMemberAnalyticsMembersActivityController } from "./controllers/communityPlatform/member/analytics/members/activity/CommunityplatformMemberAnalyticsMembersActivityController";
import { CommunityplatformMemberAuthMembersEmailController } from "./controllers/communityPlatform/member/auth/members/email/CommunityplatformMemberAuthMembersEmailController";
import { CommunityplatformMemberAuthMembersLogoutController } from "./controllers/communityPlatform/member/auth/members/logout/CommunityplatformMemberAuthMembersLogoutController";
import { CommunityplatformMemberCommentsRepliesController } from "./controllers/communityPlatform/member/comments/replies/CommunityplatformMemberCommentsRepliesController";
import { CommunityplatformMemberCommentsRepliesReportsController } from "./controllers/communityPlatform/member/comments/replies/reports/CommunityplatformMemberCommentsRepliesReportsController";
import { CommunityplatformMemberCommentsRepliesVotesController } from "./controllers/communityPlatform/member/comments/replies/votes/CommunityplatformMemberCommentsRepliesVotesController";
import { CommunityplatformMemberCommunitiesController } from "./controllers/communityPlatform/member/communities/CommunityplatformMemberCommunitiesController";
import { CommunityplatformMemberCommunitiesPostsController } from "./controllers/communityPlatform/member/communities/posts/CommunityplatformMemberCommunitiesPostsController";
import { CommunityplatformMemberCommunitiesSubscribersController } from "./controllers/communityPlatform/member/communities/subscribers/CommunityplatformMemberCommunitiesSubscribersController";
import { CommunityplatformMemberDashboardMembersOverviewController } from "./controllers/communityPlatform/member/dashboard/members/overview/CommunityplatformMemberDashboardMembersOverviewController";
import { CommunityplatformMemberMembersController } from "./controllers/communityPlatform/member/members/CommunityplatformMemberMembersController";
import { CommunityplatformMemberPostsController } from "./controllers/communityPlatform/member/posts/CommunityplatformMemberPostsController";
import { CommunityplatformMemberPostsCommentsController } from "./controllers/communityPlatform/member/posts/comments/CommunityplatformMemberPostsCommentsController";
import { CommunityplatformMemberPostsCommentsReportsController } from "./controllers/communityPlatform/member/posts/comments/reports/CommunityplatformMemberPostsCommentsReportsController";
import { CommunityplatformMemberPostsCommentsVotesController } from "./controllers/communityPlatform/member/posts/comments/votes/CommunityplatformMemberPostsCommentsVotesController";
import { CommunityplatformMemberPostsControversialController } from "./controllers/communityPlatform/member/posts/controversial/CommunityplatformMemberPostsControversialController";
import { CommunityplatformMemberPostsHotController } from "./controllers/communityPlatform/member/posts/hot/CommunityplatformMemberPostsHotController";
import { CommunityplatformMemberPosts_newController } from "./controllers/communityPlatform/member/posts/new/CommunityplatformMemberPosts_newController";
import { CommunityplatformMemberPostsTopController } from "./controllers/communityPlatform/member/posts/top/CommunityplatformMemberPostsTopController";
import { CommunityplatformMemberPostsVotesController } from "./controllers/communityPlatform/member/posts/votes/CommunityplatformMemberPostsVotesController";
import { CommunityplatformMemberReportsMembersActivityController } from "./controllers/communityPlatform/member/reports/members/activity/CommunityplatformMemberReportsMembersActivityController";
import { CommunityplatformMemberSearchMembersController } from "./controllers/communityPlatform/member/search/members/CommunityplatformMemberSearchMembersController";
import { CommunityplatformModeratorAuthModeratorsEmailResendController } from "./controllers/communityPlatform/moderator/auth/moderators/email/resend/CommunityplatformModeratorAuthModeratorsEmailResendController";
import { CommunityplatformModeratorAuthModeratorsEmailVerifyController } from "./controllers/communityPlatform/moderator/auth/moderators/email/verify/CommunityplatformModeratorAuthModeratorsEmailVerifyController";
import { CommunityplatformModeratorAuthModeratorsLogoutController } from "./controllers/communityPlatform/moderator/auth/moderators/logout/CommunityplatformModeratorAuthModeratorsLogoutController";
import { CommunityplatformModeratorCommentsRepliesController } from "./controllers/communityPlatform/moderator/comments/replies/CommunityplatformModeratorCommentsRepliesController";
import { CommunityplatformModeratorCommunitiesController } from "./controllers/communityPlatform/moderator/communities/CommunityplatformModeratorCommunitiesController";
import { CommunityplatformModeratorModerationBansController } from "./controllers/communityPlatform/moderator/moderation/bans/CommunityplatformModeratorModerationBansController";
import { CommunityplatformModeratorModerationCommentsAnalyticsController } from "./controllers/communityPlatform/moderator/moderation/comments/analytics/CommunityplatformModeratorModerationCommentsAnalyticsController";
import { CommunityplatformModeratorModerationModeration_logsController } from "./controllers/communityPlatform/moderator/moderation/moderation-logs/CommunityplatformModeratorModerationModeration_logsController";
import { CommunityplatformModeratorModerationReportsController } from "./controllers/communityPlatform/moderator/moderation/reports/CommunityplatformModeratorModerationReportsController";
import { CommunityplatformModeratorModeratorsController } from "./controllers/communityPlatform/moderator/moderators/CommunityplatformModeratorModeratorsController";
import { CommunityplatformModeratorPostsCommentsController } from "./controllers/communityPlatform/moderator/posts/comments/CommunityplatformModeratorPostsCommentsController";
import { CommunityplatformModeratorPostsCommentsVisibilitiesController } from "./controllers/communityPlatform/moderator/posts/comments/visibilities/CommunityplatformModeratorPostsCommentsVisibilitiesController";
import { CommunityplatformOwnerAuthOwnersEmailController } from "./controllers/communityPlatform/owner/auth/owners/email/resend/CommunityplatformOwnerAuthOwnersEmailController";
import { CommunityplatformOwnerAuthOwnersEmailVerifyController } from "./controllers/communityPlatform/owner/auth/owners/email/verify/CommunityplatformOwnerAuthOwnersEmailVerifyController";
import { CommunityplatformOwnerAuthOwnersLogoutController } from "./controllers/communityPlatform/owner/auth/owners/logout/CommunityplatformOwnerAuthOwnersLogoutController";
import { CommunityplatformOwnerCommunitiesController } from "./controllers/communityPlatform/owner/communities/CommunityplatformOwnerCommunitiesController";
import { CommunityplatformOwnerModerationBansController } from "./controllers/communityPlatform/owner/moderation/bans/CommunityplatformOwnerModerationBansController";
import { CommunityplatformOwnerModerationModeration_logsController } from "./controllers/communityPlatform/owner/moderation/moderation-logs/CommunityplatformOwnerModerationModeration_logsController";
import { CommunityplatformOwnerModerationReportsController } from "./controllers/communityPlatform/owner/moderation/reports/CommunityplatformOwnerModerationReportsController";
import { CommunityplatformOwnerOwnersController } from "./controllers/communityPlatform/owner/owners/CommunityplatformOwnerOwnersController";
import { CommunityplatformPostsCommentsSortController } from "./controllers/communityPlatform/posts/comments/sort/CommunityplatformPostsCommentsSortController";
import { CommunityplatformPostsPopularController } from "./controllers/communityPlatform/posts/popular/CommunityplatformPostsPopularController";
import { CommunityplatformSearchCommentsController } from "./controllers/communityPlatform/search/comments/CommunityplatformSearchCommentsController";

@Module({
  controllers: [
    CommunityplatformAuthGuestController,
    CommunityplatformAuthMemberController,
    CommunityplatformAuthModeratorController,
    CommunityplatformAuthOwnerController,
    CommunityplatformMemberAuthMembersEmailController,
    CommunityplatformMemberAuthMembersLogoutController,
    CommunityplatformModeratorAuthModeratorsEmailVerifyController,
    CommunityplatformModeratorAuthModeratorsEmailResendController,
    CommunityplatformModeratorAuthModeratorsLogoutController,
    CommunityplatformOwnerAuthOwnersEmailVerifyController,
    CommunityplatformOwnerAuthOwnersEmailController,
    CommunityplatformOwnerAuthOwnersLogoutController,
    CommunityplatformMemberMembersController,
    CommunityplatformModeratorModeratorsController,
    CommunityplatformOwnerOwnersController,
    CommunityplatformMemberCommunitiesController,
    CommunityplatformModeratorCommunitiesController,
    CommunityplatformOwnerCommunitiesController,
    CommunityplatformMemberCommunitiesSubscribersController,
    CommunityplatformMemberPostsController,
    CommunityplatformMemberPostsVotesController,
    CommunityplatformMemberPostsCommentsController,
    CommunityplatformModeratorPostsCommentsController,
    CommunityplatformMemberCommentsRepliesController,
    CommunityplatformModeratorCommentsRepliesController,
    CommunityplatformMemberPostsCommentsVotesController,
    CommunityplatformMemberCommentsRepliesVotesController,
    CommunityplatformMemberPostsCommentsReportsController,
    CommunityplatformMemberCommentsRepliesReportsController,
    CommunityplatformModeratorPostsCommentsVisibilitiesController,
    CommunityplatformModeratorModerationBansController,
    CommunityplatformOwnerModerationBansController,
    CommunityplatformModeratorModerationReportsController,
    CommunityplatformOwnerModerationReportsController,
    CommunityplatformModeratorModerationModeration_logsController,
    CommunityplatformOwnerModerationModeration_logsController,
    CommunityplatformMemberCommunitiesPostsController,
    CommunityplatformMemberDashboardMembersOverviewController,
    CommunityplatformMemberAnalyticsMembersActivityController,
    CommunityplatformMemberSearchMembersController,
    CommunityplatformMemberReportsMembersActivityController,
    CommunityplatformCommunitiesSearchController,
    CommunityplatformCommunitiesFeedController,
    CommunityplatformMemberPostsHotController,
    CommunityplatformMemberPosts_newController,
    CommunityplatformMemberPostsTopController,
    CommunityplatformMemberPostsControversialController,
    CommunityplatformPostsPopularController,
    CommunityplatformPostsCommentsSortController,
    CommunityplatformCommentsThread_summaryController,
    CommunityplatformModeratorModerationCommentsAnalyticsController,
    CommunityplatformSearchCommentsController,
    CommunityplatformCommunitiesPostsHotController,
    CommunityplatformCommunitiesPosts_newController,
    CommunityplatformCommunitiesPostsTopController,
    CommunityplatformCommunitiesPostsControversialController,
  ],
})
export class MyModule {}
