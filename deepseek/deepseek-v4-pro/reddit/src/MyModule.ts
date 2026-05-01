import { Module } from "@nestjs/common";

import { CommunityhubAuthGuestController } from "./controllers/communityHub/auth/guest/CommunityhubAuthGuestController";
import { CommunityhubAuthMemberController } from "./controllers/communityHub/auth/member/CommunityhubAuthMemberController";
import { CommunityhubCommentsController } from "./controllers/communityHub/comments/CommunityhubCommentsController";
import { CommunityhubCommunitiesController } from "./controllers/communityHub/communities/CommunityhubCommunitiesController";
import { CommunityhubCommunitiesFeedController } from "./controllers/communityHub/communities/feed/CommunityhubCommunitiesFeedController";
import { CommunityhubCommunitiesModeratorsController } from "./controllers/communityHub/communities/moderators/CommunityhubCommunitiesModeratorsController";
import { CommunityhubCommunitiesPostsController } from "./controllers/communityHub/communities/posts/CommunityhubCommunitiesPostsController";
import { CommunityhubCommunitiesSubscriptionsController } from "./controllers/communityHub/communities/subscriptions/CommunityhubCommunitiesSubscriptionsController";
import { CommunityhubFeedHomeController } from "./controllers/communityHub/feed/home/CommunityhubFeedHomeController";
import { CommunityhubFeedController } from "./controllers/communityHub/feed/popular/CommunityhubFeedController";
import { CommunityhubGuestSessionsController } from "./controllers/communityHub/guest/sessions/CommunityhubGuestSessionsController";
import { CommunityhubGuestsController } from "./controllers/communityHub/guests/CommunityhubGuestsController";
import { CommunityhubMemberCommentsController } from "./controllers/communityHub/member/comments/CommunityhubMemberCommentsController";
import { CommunityhubMemberCommentsVoteController } from "./controllers/communityHub/member/comments/vote/CommunityhubMemberCommentsVoteController";
import { CommunityhubMemberCommunitiesController } from "./controllers/communityHub/member/communities/CommunityhubMemberCommunitiesController";
import { CommunityhubMemberCommunitiesBansController } from "./controllers/communityHub/member/communities/bans/CommunityhubMemberCommunitiesBansController";
import { CommunityhubMemberCommunitiesModeratorsController } from "./controllers/communityHub/member/communities/moderators/CommunityhubMemberCommunitiesModeratorsController";
import { CommunityhubMemberCommunitiesReportsController } from "./controllers/communityHub/member/communities/reports/CommunityhubMemberCommunitiesReportsController";
import { CommunityhubMemberCommunitiesSubscriptionsController } from "./controllers/communityHub/member/communities/subscriptions/CommunityhubMemberCommunitiesSubscriptionsController";
import { CommunityhubMemberPostsController } from "./controllers/communityHub/member/posts/CommunityhubMemberPostsController";
import { CommunityhubMemberPostsVoteController } from "./controllers/communityHub/member/posts/vote/CommunityhubMemberPostsVoteController";
import { CommunityhubMemberProfileController } from "./controllers/communityHub/member/profile/CommunityhubMemberProfileController";
import { CommunityhubMemberReportsController } from "./controllers/communityHub/member/reports/CommunityhubMemberReportsController";
import { CommunityhubMemberSubscriptionsController } from "./controllers/communityHub/member/subscriptions/CommunityhubMemberSubscriptionsController";
import { CommunityhubMemberVotesController } from "./controllers/communityHub/member/votes/CommunityhubMemberVotesController";
import { CommunityhubMembersController } from "./controllers/communityHub/members/CommunityhubMembersController";
import { CommunityhubMembersEmail_verificationsController } from "./controllers/communityHub/members/email-verifications/CommunityhubMembersEmail_verificationsController";
import { CommunityhubMembersPassword_resetsController } from "./controllers/communityHub/members/password-resets/CommunityhubMembersPassword_resetsController";
import { CommunityhubPostsController } from "./controllers/communityHub/posts/CommunityhubPostsController";
import { CommunityhubPostsCommentsController } from "./controllers/communityHub/posts/comments/CommunityhubPostsCommentsController";
import { CommunityhubPosts_imageController } from "./controllers/communityHub/posts/image/CommunityhubPosts_imageController";

@Module({
  controllers: [
    CommunityhubAuthGuestController,
    CommunityhubAuthMemberController,
    CommunityhubGuestsController,
    CommunityhubGuestSessionsController,
    CommunityhubMembersController,
    CommunityhubMemberProfileController,
    CommunityhubMembersPassword_resetsController,
    CommunityhubMembersEmail_verificationsController,
    CommunityhubCommunitiesController,
    CommunityhubMemberCommunitiesController,
    CommunityhubCommunitiesSubscriptionsController,
    CommunityhubMemberCommunitiesSubscriptionsController,
    CommunityhubMemberSubscriptionsController,
    CommunityhubCommunitiesModeratorsController,
    CommunityhubMemberCommunitiesModeratorsController,
    CommunityhubMemberCommunitiesBansController,
    CommunityhubPostsController,
    CommunityhubCommunitiesPostsController,
    CommunityhubFeedHomeController,
    CommunityhubFeedController,
    CommunityhubCommunitiesFeedController,
    CommunityhubPosts_imageController,
    CommunityhubPostsCommentsController,
    CommunityhubCommentsController,
    CommunityhubMemberVotesController,
    CommunityhubMemberReportsController,
    CommunityhubMemberCommunitiesReportsController,
    CommunityhubMemberPostsController,
    CommunityhubMemberPostsVoteController,
    CommunityhubMemberCommentsController,
    CommunityhubMemberCommentsVoteController,
  ],
})
export class MyModule {}
