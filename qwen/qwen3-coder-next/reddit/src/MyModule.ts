import { Module } from "@nestjs/common";

import { RedditlikeAdminBansController } from "./controllers/redditLike/admin/bans/RedditlikeAdminBansController";
import { RedditlikeAdminCommunitiesBansController } from "./controllers/redditLike/admin/communities/bans/RedditlikeAdminCommunitiesBansController";
import { RedditlikeAdminCommunitiesModerator_rolesController } from "./controllers/redditLike/admin/communities/moderator-roles/RedditlikeAdminCommunitiesModerator_rolesController";
import { RedditlikeAdminCommunitiesMyController } from "./controllers/redditLike/admin/communities/my/RedditlikeAdminCommunitiesMyController";
import { RedditlikeAdminCommunitiesReportsController } from "./controllers/redditLike/admin/communities/reports/RedditlikeAdminCommunitiesReportsController";
import { RedditlikeAdminDashboardController } from "./controllers/redditLike/admin/dashboard/RedditlikeAdminDashboardController";
import { RedditlikeAdminModerationConductController } from "./controllers/redditLike/admin/moderation/conduct/RedditlikeAdminModerationConductController";
import { RedditlikeAdminModerator_rolesController } from "./controllers/redditLike/admin/moderator-roles/RedditlikeAdminModerator_rolesController";
import { RedditlikeAdminReportsController } from "./controllers/redditLike/admin/reports/RedditlikeAdminReportsController";
import { RedditlikeAdminSearchContentController } from "./controllers/redditLike/admin/search/content/RedditlikeAdminSearchContentController";
import { RedditlikeAuthAdminController } from "./controllers/redditLike/auth/admin/RedditlikeAuthAdminController";
import { RedditlikeAuthGuestController } from "./controllers/redditLike/auth/guest/RedditlikeAuthGuestController";
import { RedditlikeAuthMemberController } from "./controllers/redditLike/auth/member/RedditlikeAuthMemberController";
import { RedditlikeAuthModeratorController } from "./controllers/redditLike/auth/moderator/RedditlikeAuthModeratorController";
import { RedditlikeCommunitiesController } from "./controllers/redditLike/communities/RedditlikeCommunitiesController";
import { RedditlikeGuestCommunitiesPostsController } from "./controllers/redditLike/guest/communities/posts/RedditlikeGuestCommunitiesPostsController";
import { RedditlikeGuestPopularController } from "./controllers/redditLike/guest/popular/RedditlikeGuestPopularController";
import { RedditlikeGuestPostsController } from "./controllers/redditLike/guest/posts/RedditlikeGuestPostsController";
import { RedditlikeGuestPostsCommentsController } from "./controllers/redditLike/guest/posts/comments/RedditlikeGuestPostsCommentsController";
import { RedditlikeGuestPostsPopularController } from "./controllers/redditLike/guest/posts/popular/RedditlikeGuestPostsPopularController";
import { RedditlikeGuestPostsRevisionsController } from "./controllers/redditLike/guest/posts/revisions/RedditlikeGuestPostsRevisionsController";
import { RedditlikeGuestPostsSnapshotsController } from "./controllers/redditLike/guest/posts/snapshots/RedditlikeGuestPostsSnapshotsController";
import { RedditlikeGuestPostsVote_summaryController } from "./controllers/redditLike/guest/posts/vote-summary/RedditlikeGuestPostsVote_summaryController";
import { RedditlikeGuestVote_statisticsController } from "./controllers/redditLike/guest/vote-statistics/RedditlikeGuestVote_statisticsController";
import { RedditlikeMemberCommentsController } from "./controllers/redditLike/member/comments/RedditlikeMemberCommentsController";
import { RedditlikeMemberCommentsReportsController } from "./controllers/redditLike/member/comments/reports/RedditlikeMemberCommentsReportsController";
import { RedditlikeMemberCommentsVoteController } from "./controllers/redditLike/member/comments/vote/RedditlikeMemberCommentsVoteController";
import { RedditlikeMemberCommunitiesController } from "./controllers/redditLike/member/communities/RedditlikeMemberCommunitiesController";
import { RedditlikeMemberCommunitiesMyController } from "./controllers/redditLike/member/communities/my/RedditlikeMemberCommunitiesMyController";
import { RedditlikeMemberCommunitiesPostsController } from "./controllers/redditLike/member/communities/posts/RedditlikeMemberCommunitiesPostsController";
import { RedditlikeMemberHomeController } from "./controllers/redditLike/member/home/RedditlikeMemberHomeController";
import { RedditlikeMemberPopularController } from "./controllers/redditLike/member/popular/RedditlikeMemberPopularController";
import { RedditlikeMemberPostsController } from "./controllers/redditLike/member/posts/RedditlikeMemberPostsController";
import { RedditlikeMemberPostsCommentsController } from "./controllers/redditLike/member/posts/comments/RedditlikeMemberPostsCommentsController";
import { RedditlikeMemberPostsHomeController } from "./controllers/redditLike/member/posts/home/RedditlikeMemberPostsHomeController";
import { RedditlikeMemberPostsPopularController } from "./controllers/redditLike/member/posts/popular/RedditlikeMemberPostsPopularController";
import { RedditlikeMemberPostsReportsController } from "./controllers/redditLike/member/posts/reports/RedditlikeMemberPostsReportsController";
import { RedditlikeMemberPostsRevisionsController } from "./controllers/redditLike/member/posts/revisions/RedditlikeMemberPostsRevisionsController";
import { RedditlikeMemberPostsSnapshotsController } from "./controllers/redditLike/member/posts/snapshots/RedditlikeMemberPostsSnapshotsController";
import { RedditlikeMemberPostsVote_summaryController } from "./controllers/redditLike/member/posts/vote-summary/RedditlikeMemberPostsVote_summaryController";
import { RedditlikeMemberPostsVotesController } from "./controllers/redditLike/member/posts/votes/RedditlikeMemberPostsVotesController";
import { RedditlikeMemberProfileController } from "./controllers/redditLike/member/profile/RedditlikeMemberProfileController";
import { RedditlikeMemberSubscriptionsController } from "./controllers/redditLike/member/subscriptions/RedditlikeMemberSubscriptionsController";
import { RedditlikeMemberVote_statisticsController } from "./controllers/redditLike/member/vote-statistics/RedditlikeMemberVote_statisticsController";
import { RedditlikeModeratorCommentsController } from "./controllers/redditLike/moderator/comments/RedditlikeModeratorCommentsController";
import { RedditlikeModeratorCommentsVoteController } from "./controllers/redditLike/moderator/comments/vote/RedditlikeModeratorCommentsVoteController";
import { RedditlikeModeratorCommunitiesModerator_rolesController } from "./controllers/redditLike/moderator/communities/moderator-roles/RedditlikeModeratorCommunitiesModerator_rolesController";
import { RedditlikeModeratorCommunitiesMyController } from "./controllers/redditLike/moderator/communities/my/RedditlikeModeratorCommunitiesMyController";
import { RedditlikeModeratorCommunitiesReportsController } from "./controllers/redditLike/moderator/communities/reports/RedditlikeModeratorCommunitiesReportsController";
import { RedditlikeModeratorModerator_rolesController } from "./controllers/redditLike/moderator/moderator-roles/RedditlikeModeratorModerator_rolesController";
import { RedditlikeModeratorPassword_resetsController } from "./controllers/redditLike/moderator/password-resets/RedditlikeModeratorPassword_resetsController";
import { RedditlikeModeratorPostsCommentsController } from "./controllers/redditLike/moderator/posts/comments/RedditlikeModeratorPostsCommentsController";
import { RedditlikeModeratorProfileController } from "./controllers/redditLike/moderator/profile/RedditlikeModeratorProfileController";
import { RedditlikeModeratorReportsController } from "./controllers/redditLike/moderator/reports/RedditlikeModeratorReportsController";
import { RedditlikeModeratorSessionsController } from "./controllers/redditLike/moderator/sessions/RedditlikeModeratorSessionsController";

@Module({
  controllers: [
    RedditlikeAuthGuestController,
    RedditlikeAuthMemberController,
    RedditlikeAuthModeratorController,
    RedditlikeAuthAdminController,
    RedditlikeMemberProfileController,
    RedditlikeModeratorProfileController,
    RedditlikeModeratorSessionsController,
    RedditlikeModeratorPassword_resetsController,
    RedditlikeCommunitiesController,
    RedditlikeMemberSubscriptionsController,
    RedditlikeMemberCommunitiesController,
    RedditlikeMemberPostsController,
    RedditlikeMemberPostsHomeController,
    RedditlikeGuestPostsPopularController,
    RedditlikeMemberPostsPopularController,
    RedditlikeGuestCommunitiesPostsController,
    RedditlikeMemberCommunitiesPostsController,
    RedditlikeGuestPostsController,
    RedditlikeGuestPostsSnapshotsController,
    RedditlikeMemberPostsSnapshotsController,
    RedditlikeGuestPostsRevisionsController,
    RedditlikeMemberPostsRevisionsController,
    RedditlikeMemberPostsVotesController,
    RedditlikeGuestPostsVote_summaryController,
    RedditlikeMemberPostsVote_summaryController,
    RedditlikeGuestPostsCommentsController,
    RedditlikeMemberPostsCommentsController,
    RedditlikeMemberCommentsController,
    RedditlikeModeratorCommentsController,
    RedditlikeModeratorPostsCommentsController,
    RedditlikeMemberCommentsVoteController,
    RedditlikeModeratorCommentsVoteController,
    RedditlikeModeratorCommunitiesModerator_rolesController,
    RedditlikeAdminCommunitiesModerator_rolesController,
    RedditlikeModeratorModerator_rolesController,
    RedditlikeAdminModerator_rolesController,
    RedditlikeModeratorCommunitiesReportsController,
    RedditlikeAdminCommunitiesReportsController,
    RedditlikeModeratorReportsController,
    RedditlikeAdminReportsController,
    RedditlikeMemberPostsReportsController,
    RedditlikeMemberCommentsReportsController,
    RedditlikeAdminCommunitiesBansController,
    RedditlikeAdminBansController,
    RedditlikeMemberCommunitiesMyController,
    RedditlikeModeratorCommunitiesMyController,
    RedditlikeAdminCommunitiesMyController,
    RedditlikeMemberHomeController,
    RedditlikeGuestPopularController,
    RedditlikeMemberPopularController,
    RedditlikeGuestVote_statisticsController,
    RedditlikeMemberVote_statisticsController,
    RedditlikeAdminDashboardController,
    RedditlikeAdminSearchContentController,
    RedditlikeAdminModerationConductController,
  ],
})
export class MyModule {}
