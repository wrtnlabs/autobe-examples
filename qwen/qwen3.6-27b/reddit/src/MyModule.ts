import { Module } from "@nestjs/common";

import { RedditlikecommunityAuthGuestController } from "./controllers/redditLikeCommunity/auth/guest/RedditlikecommunityAuthGuestController";
import { RedditlikecommunityAuthMemberController } from "./controllers/redditLikeCommunity/auth/member/RedditlikecommunityAuthMemberController";
import { RedditlikecommunityBansController } from "./controllers/redditLikeCommunity/bans/RedditlikecommunityBansController";
import { RedditlikecommunityComment_votesController } from "./controllers/redditLikeCommunity/comment-votes/RedditlikecommunityComment_votesController";
import { RedditlikecommunityCommunitiesController } from "./controllers/redditLikeCommunity/communities/RedditlikecommunityCommunitiesController";
import { RedditlikecommunityCommunitiesCommunity_bansController } from "./controllers/redditLikeCommunity/communities/community-bans/RedditlikecommunityCommunitiesCommunity_bansController";
import { RedditlikecommunityCommunitiesCommunity_moderatorsController } from "./controllers/redditLikeCommunity/communities/community-moderators/RedditlikecommunityCommunitiesCommunity_moderatorsController";
import { RedditlikecommunityCommunitiesFeedsController } from "./controllers/redditLikeCommunity/communities/feeds/RedditlikecommunityCommunitiesFeedsController";
import { RedditlikecommunityCommunitiesModeratorsController } from "./controllers/redditLikeCommunity/communities/moderators/RedditlikecommunityCommunitiesModeratorsController";
import { RedditlikecommunityCommunity_profilesController } from "./controllers/redditLikeCommunity/community-profiles/RedditlikecommunityCommunity_profilesController";
import { RedditlikecommunityCommunity_snapshotsController } from "./controllers/redditLikeCommunity/community-snapshots/RedditlikecommunityCommunity_snapshotsController";
import { RedditlikecommunityFeedsPopularController } from "./controllers/redditLikeCommunity/feeds/popular/RedditlikecommunityFeedsPopularController";
import { RedditlikecommunityGuestPostsCommentsController } from "./controllers/redditLikeCommunity/guest/posts/comments/RedditlikecommunityGuestPostsCommentsController";
import { RedditlikecommunityGuestPostsCommentsSnapshotsController } from "./controllers/redditLikeCommunity/guest/posts/comments/snapshots/RedditlikecommunityGuestPostsCommentsSnapshotsController";
import { RedditlikecommunityMemberBansController } from "./controllers/redditLikeCommunity/member/bans/RedditlikecommunityMemberBansController";
import { RedditlikecommunityMemberComment_votesController } from "./controllers/redditLikeCommunity/member/comment-votes/RedditlikecommunityMemberComment_votesController";
import { RedditlikecommunityMemberCommentsVotesController } from "./controllers/redditLikeCommunity/member/comments/votes/RedditlikecommunityMemberCommentsVotesController";
import { RedditlikecommunityMemberCommunitiesController } from "./controllers/redditLikeCommunity/member/communities/RedditlikecommunityMemberCommunitiesController";
import { RedditlikecommunityMemberCommunitiesBansController } from "./controllers/redditLikeCommunity/member/communities/bans/RedditlikecommunityMemberCommunitiesBansController";
import { RedditlikecommunityMemberCommunitiesCommunity_bansController } from "./controllers/redditLikeCommunity/member/communities/community-bans/RedditlikecommunityMemberCommunitiesCommunity_bansController";
import { RedditlikecommunityMemberCommunitiesCommunity_moderatorsController } from "./controllers/redditLikeCommunity/member/communities/community-moderators/RedditlikecommunityMemberCommunitiesCommunity_moderatorsController";
import { RedditlikecommunityMemberCommunitiesModeratorsController } from "./controllers/redditLikeCommunity/member/communities/moderators/RedditlikecommunityMemberCommunitiesModeratorsController";
import { RedditlikecommunityMemberCommunity_profilesController } from "./controllers/redditLikeCommunity/member/community-profiles/RedditlikecommunityMemberCommunity_profilesController";
import { RedditlikecommunityMemberCommunity_subscriptionsController } from "./controllers/redditLikeCommunity/member/community-subscriptions/RedditlikecommunityMemberCommunity_subscriptionsController";
import { RedditlikecommunityMemberFeedsHomeController } from "./controllers/redditLikeCommunity/member/feeds/home/RedditlikecommunityMemberFeedsHomeController";
import { RedditlikecommunityMemberModeratorsController } from "./controllers/redditLikeCommunity/member/moderators/RedditlikecommunityMemberModeratorsController";
import { RedditlikecommunityMemberPostsController } from "./controllers/redditLikeCommunity/member/posts/RedditlikecommunityMemberPostsController";
import { RedditlikecommunityMemberPostsCommentsController } from "./controllers/redditLikeCommunity/member/posts/comments/RedditlikecommunityMemberPostsCommentsController";
import { RedditlikecommunityMemberPostsCommentsSnapshotsController } from "./controllers/redditLikeCommunity/member/posts/comments/snapshots/RedditlikecommunityMemberPostsCommentsSnapshotsController";
import { RedditlikecommunityMemberPostsVotesController } from "./controllers/redditLikeCommunity/member/posts/votes/RedditlikecommunityMemberPostsVotesController";
import { RedditlikecommunityMemberProfileController } from "./controllers/redditLikeCommunity/member/profile/RedditlikecommunityMemberProfileController";
import { RedditlikecommunityMemberProfilesImagesController } from "./controllers/redditLikeCommunity/member/profiles/images/RedditlikecommunityMemberProfilesImagesController";
import { RedditlikecommunityMemberReportsController } from "./controllers/redditLikeCommunity/member/reports/RedditlikecommunityMemberReportsController";
import { RedditlikecommunityMemberReportsCommunityController } from "./controllers/redditLikeCommunity/member/reports/community/RedditlikecommunityMemberReportsCommunityController";
import { RedditlikecommunityMemberReportsDismissController } from "./controllers/redditLikeCommunity/member/reports/dismiss/RedditlikecommunityMemberReportsDismissController";
import { RedditlikecommunityMemberReportsReport_on_commentsController } from "./controllers/redditLikeCommunity/member/reports/report-on-comments/RedditlikecommunityMemberReportsReport_on_commentsController";
import { RedditlikecommunityMemberReportsReport_on_postsController } from "./controllers/redditLikeCommunity/member/reports/report-on-posts/RedditlikecommunityMemberReportsReport_on_postsController";
import { RedditlikecommunityMemberReportsReportonpostsController } from "./controllers/redditLikeCommunity/member/reports/reportOnPosts/RedditlikecommunityMemberReportsReportonpostsController";
import { RedditlikecommunityMemberSubscriptionsController } from "./controllers/redditLikeCommunity/member/subscriptions/RedditlikecommunityMemberSubscriptionsController";
import { RedditlikecommunityMemberUsersSubscriptionsController } from "./controllers/redditLikeCommunity/member/users/subscriptions/RedditlikecommunityMemberUsersSubscriptionsController";
import { RedditlikecommunityMemberVotesCommentsCheckController } from "./controllers/redditLikeCommunity/member/votes/comments/check/RedditlikecommunityMemberVotesCommentsCheckController";
import { RedditlikecommunityMemberVotesCommentsDownvoteController } from "./controllers/redditLikeCommunity/member/votes/comments/downvote/RedditlikecommunityMemberVotesCommentsDownvoteController";
import { RedditlikecommunityMemberVotesCommentsRemoveController } from "./controllers/redditLikeCommunity/member/votes/comments/remove/RedditlikecommunityMemberVotesCommentsRemoveController";
import { RedditlikecommunityMemberVotesCommentsController } from "./controllers/redditLikeCommunity/member/votes/comments/upvote/RedditlikecommunityMemberVotesCommentsController";
import { RedditlikecommunityMemberVotesPostsController } from "./controllers/redditLikeCommunity/member/votes/posts/RedditlikecommunityMemberVotesPostsController";
import { RedditlikecommunityMembersController } from "./controllers/redditLikeCommunity/members/RedditlikecommunityMembersController";
import { RedditlikecommunityMembersProfilesController } from "./controllers/redditLikeCommunity/members/profiles/RedditlikecommunityMembersProfilesController";
import { RedditlikecommunityModeratorsController } from "./controllers/redditLikeCommunity/moderators/RedditlikecommunityModeratorsController";
import { RedditlikecommunityPostsController } from "./controllers/redditLikeCommunity/posts/RedditlikecommunityPostsController";
import { RedditlikecommunityPostsImageController } from "./controllers/redditLikeCommunity/posts/image/RedditlikecommunityPostsImageController";
import { RedditlikecommunityPostsSnapshotsController } from "./controllers/redditLikeCommunity/posts/snapshots/RedditlikecommunityPostsSnapshotsController";
import { RedditlikecommunityProfilesController } from "./controllers/redditLikeCommunity/profiles/RedditlikecommunityProfilesController";
import { RedditlikecommunityProfilesImagesController } from "./controllers/redditLikeCommunity/profiles/images/RedditlikecommunityProfilesImagesController";
import { RedditlikecommunityReportsController } from "./controllers/redditLikeCommunity/reports/RedditlikecommunityReportsController";
import { RedditlikecommunityReportsReport_on_commentsController } from "./controllers/redditLikeCommunity/reports/report-on-comments/RedditlikecommunityReportsReport_on_commentsController";
import { RedditlikecommunityReportsReport_on_postsController } from "./controllers/redditLikeCommunity/reports/report-on-posts/RedditlikecommunityReportsReport_on_postsController";

@Module({
  controllers: [
    RedditlikecommunityAuthGuestController,
    RedditlikecommunityAuthMemberController,
    RedditlikecommunityMembersController,
    RedditlikecommunityMemberProfileController,
    RedditlikecommunityProfilesController,
    RedditlikecommunityProfilesImagesController,
    RedditlikecommunityMemberProfilesImagesController,
    RedditlikecommunityCommunitiesController,
    RedditlikecommunityMemberCommunitiesController,
    RedditlikecommunityMemberCommunity_subscriptionsController,
    RedditlikecommunityCommunity_snapshotsController,
    RedditlikecommunityCommunity_profilesController,
    RedditlikecommunityMemberCommunity_profilesController,
    RedditlikecommunityPostsController,
    RedditlikecommunityMemberPostsController,
    RedditlikecommunityPostsSnapshotsController,
    RedditlikecommunityPostsImageController,
    RedditlikecommunityMemberUsersSubscriptionsController,
    RedditlikecommunityMemberSubscriptionsController,
    RedditlikecommunityGuestPostsCommentsController,
    RedditlikecommunityMemberPostsCommentsController,
    RedditlikecommunityGuestPostsCommentsSnapshotsController,
    RedditlikecommunityMemberPostsCommentsSnapshotsController,
    RedditlikecommunityMemberPostsVotesController,
    RedditlikecommunityMemberCommentsVotesController,
    RedditlikecommunityMembersProfilesController,
    RedditlikecommunityCommunitiesCommunity_moderatorsController,
    RedditlikecommunityMemberCommunitiesCommunity_moderatorsController,
    RedditlikecommunityModeratorsController,
    RedditlikecommunityCommunitiesModeratorsController,
    RedditlikecommunityMemberModeratorsController,
    RedditlikecommunityMemberCommunitiesModeratorsController,
    RedditlikecommunityCommunitiesCommunity_bansController,
    RedditlikecommunityMemberCommunitiesCommunity_bansController,
    RedditlikecommunityBansController,
    RedditlikecommunityMemberCommunitiesBansController,
    RedditlikecommunityMemberBansController,
    RedditlikecommunityReportsController,
    RedditlikecommunityMemberReportsController,
    RedditlikecommunityReportsReport_on_postsController,
    RedditlikecommunityMemberReportsReport_on_postsController,
    RedditlikecommunityMemberReportsReportonpostsController,
    RedditlikecommunityReportsReport_on_commentsController,
    RedditlikecommunityMemberReportsReport_on_commentsController,
    RedditlikecommunityComment_votesController,
    RedditlikecommunityMemberComment_votesController,
    RedditlikecommunityMemberFeedsHomeController,
    RedditlikecommunityFeedsPopularController,
    RedditlikecommunityCommunitiesFeedsController,
    RedditlikecommunityMemberVotesPostsController,
    RedditlikecommunityMemberVotesCommentsController,
    RedditlikecommunityMemberVotesCommentsDownvoteController,
    RedditlikecommunityMemberVotesCommentsRemoveController,
    RedditlikecommunityMemberVotesCommentsCheckController,
    RedditlikecommunityMemberReportsDismissController,
    RedditlikecommunityMemberReportsCommunityController,
  ],
})
export class MyModule {}
