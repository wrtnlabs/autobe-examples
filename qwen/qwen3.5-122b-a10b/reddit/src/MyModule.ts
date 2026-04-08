import { Module } from "@nestjs/common";

import { RedditlikeAuthGuestController } from "./controllers/redditLike/auth/guest/RedditlikeAuthGuestController";
import { RedditlikeAuthMemberController } from "./controllers/redditLike/auth/member/RedditlikeAuthMemberController";
import { RedditlikeCommunitiesFeedsController } from "./controllers/redditLike/communities/feeds/RedditlikeCommunitiesFeedsController";
import { RedditlikeFeedsPopularController } from "./controllers/redditLike/feeds/popular/RedditlikeFeedsPopularController";
import { RedditlikeGuestCommentsVote_summaryController } from "./controllers/redditLike/guest/comments/vote-summary/RedditlikeGuestCommentsVote_summaryController";
import { RedditlikeGuestCommunitiesController } from "./controllers/redditLike/guest/communities/RedditlikeGuestCommunitiesController";
import { RedditlikeGuestCommunitiesDiscoverController } from "./controllers/redditLike/guest/communities/discover/RedditlikeGuestCommunitiesDiscoverController";
import { RedditlikeGuestCommunitiesModeratorsController } from "./controllers/redditLike/guest/communities/moderators/RedditlikeGuestCommunitiesModeratorsController";
import { RedditlikeGuestPostsController } from "./controllers/redditLike/guest/posts/RedditlikeGuestPostsController";
import { RedditlikeGuestPostsCommentsController } from "./controllers/redditLike/guest/posts/comments/RedditlikeGuestPostsCommentsController";
import { RedditlikeGuestPostsVote_summaryController } from "./controllers/redditLike/guest/posts/vote-summary/RedditlikeGuestPostsVote_summaryController";
import { RedditlikeMemberCommentsVote_summaryController } from "./controllers/redditLike/member/comments/vote-summary/RedditlikeMemberCommentsVote_summaryController";
import { RedditlikeMemberCommentsVotesController } from "./controllers/redditLike/member/comments/votes/RedditlikeMemberCommentsVotesController";
import { RedditlikeMemberCommunitiesController } from "./controllers/redditLike/member/communities/RedditlikeMemberCommunitiesController";
import { RedditlikeMemberCommunitiesBansController } from "./controllers/redditLike/member/communities/bans/RedditlikeMemberCommunitiesBansController";
import { RedditlikeMemberCommunitiesModeratorsController } from "./controllers/redditLike/member/communities/moderators/RedditlikeMemberCommunitiesModeratorsController";
import { RedditlikeMemberCommunitiesReportsController } from "./controllers/redditLike/member/communities/reports/RedditlikeMemberCommunitiesReportsController";
import { RedditlikeMemberEmail_verificationsController } from "./controllers/redditLike/member/email-verifications/RedditlikeMemberEmail_verificationsController";
import { RedditlikeMemberFeedsHomeController } from "./controllers/redditLike/member/feeds/home/RedditlikeMemberFeedsHomeController";
import { RedditlikeMemberPassword_resetsController } from "./controllers/redditLike/member/password-resets/RedditlikeMemberPassword_resetsController";
import { RedditlikeMemberPasswordController } from "./controllers/redditLike/member/password/RedditlikeMemberPasswordController";
import { RedditlikeMemberPostsController } from "./controllers/redditLike/member/posts/RedditlikeMemberPostsController";
import { RedditlikeMemberPostsCommentsController } from "./controllers/redditLike/member/posts/comments/RedditlikeMemberPostsCommentsController";
import { RedditlikeMemberPostsVote_summaryController } from "./controllers/redditLike/member/posts/vote-summary/RedditlikeMemberPostsVote_summaryController";
import { RedditlikeMemberPostsVotesController } from "./controllers/redditLike/member/posts/votes/RedditlikeMemberPostsVotesController";
import { RedditlikeMemberProfileController } from "./controllers/redditLike/member/profile/RedditlikeMemberProfileController";
import { RedditlikeMemberReports_of_commentsController } from "./controllers/redditLike/member/reports-of-comments/RedditlikeMemberReports_of_commentsController";
import { RedditlikeMemberReports_of_postsController } from "./controllers/redditLike/member/reports-of-posts/RedditlikeMemberReports_of_postsController";
import { RedditlikeMemberReportsController } from "./controllers/redditLike/member/reports/RedditlikeMemberReportsController";
import { RedditlikeMemberSessionsController } from "./controllers/redditLike/member/sessions/RedditlikeMemberSessionsController";
import { RedditlikeMemberSubscriptionsController } from "./controllers/redditLike/member/subscriptions/RedditlikeMemberSubscriptionsController";
import { RedditlikeMemberVotesController } from "./controllers/redditLike/member/votes/RedditlikeMemberVotesController";
import { RedditlikeMembersController } from "./controllers/redditLike/members/RedditlikeMembersController";
import { RedditlikeProfilesController } from "./controllers/redditLike/profiles/RedditlikeProfilesController";

@Module({
  controllers: [
    RedditlikeAuthGuestController,
    RedditlikeAuthMemberController,
    RedditlikeMembersController,
    RedditlikeMemberProfileController,
    RedditlikeMemberSessionsController,
    RedditlikeMemberPassword_resetsController,
    RedditlikeMemberEmail_verificationsController,
    RedditlikeProfilesController,
    RedditlikeGuestCommunitiesController,
    RedditlikeMemberCommunitiesController,
    RedditlikeMemberSubscriptionsController,
    RedditlikeGuestCommunitiesModeratorsController,
    RedditlikeMemberCommunitiesModeratorsController,
    RedditlikeMemberCommunitiesBansController,
    RedditlikeGuestPostsController,
    RedditlikeMemberPostsController,
    RedditlikeGuestPostsCommentsController,
    RedditlikeMemberPostsCommentsController,
    RedditlikeMemberPostsVotesController,
    RedditlikeMemberCommentsVotesController,
    RedditlikeMemberReportsController,
    RedditlikeMemberReports_of_postsController,
    RedditlikeMemberReports_of_commentsController,
    RedditlikeMemberPasswordController,
    RedditlikeGuestCommunitiesDiscoverController,
    RedditlikeMemberFeedsHomeController,
    RedditlikeFeedsPopularController,
    RedditlikeCommunitiesFeedsController,
    RedditlikeMemberVotesController,
    RedditlikeMemberPostsVote_summaryController,
    RedditlikeGuestPostsVote_summaryController,
    RedditlikeMemberCommentsVote_summaryController,
    RedditlikeGuestCommentsVote_summaryController,
    RedditlikeMemberCommunitiesReportsController,
  ],
})
export class MyModule {}
