import { Module } from "@nestjs/common";

import { CommunityAuthGuestController } from "./controllers/community/auth/guest/CommunityAuthGuestController";
import { CommunityAuthMemberController } from "./controllers/community/auth/member/CommunityAuthMemberController";
import { CommunityCommunitiesController } from "./controllers/community/communities/CommunityCommunitiesController";
import { CommunityCommunitiesModeratorsController } from "./controllers/community/communities/moderators/CommunityCommunitiesModeratorsController";
import { CommunityCommunitiesPostsController } from "./controllers/community/communities/posts/CommunityCommunitiesPostsController";
import { CommunityGuestPostsCommentsRepliesController } from "./controllers/community/guest/posts/comments/replies/CommunityGuestPostsCommentsRepliesController";
import { CommunityGuestSessionsController } from "./controllers/community/guest/sessions/CommunityGuestSessionsController";
import { CommunityGuestsController } from "./controllers/community/guests/CommunityGuestsController";
import { CommunityMemberCommunitiesController } from "./controllers/community/member/communities/CommunityMemberCommunitiesController";
import { CommunityMemberCommunitiesBansController } from "./controllers/community/member/communities/bans/CommunityMemberCommunitiesBansController";
import { CommunityMemberCommunitiesModeratorsController } from "./controllers/community/member/communities/moderators/CommunityMemberCommunitiesModeratorsController";
import { CommunityMemberCommunitiesPostsController } from "./controllers/community/member/communities/posts/CommunityMemberCommunitiesPostsController";
import { CommunityMemberCommunitiesReportsController } from "./controllers/community/member/communities/reports/CommunityMemberCommunitiesReportsController";
import { CommunityMemberCommunitiesSubscriptionsController } from "./controllers/community/member/communities/subscriptions/CommunityMemberCommunitiesSubscriptionsController";
import { CommunityMemberFeedController } from "./controllers/community/member/feed/CommunityMemberFeedController";
import { CommunityMemberPostsController } from "./controllers/community/member/posts/CommunityMemberPostsController";
import { CommunityMemberPostsCommentsController } from "./controllers/community/member/posts/comments/CommunityMemberPostsCommentsController";
import { CommunityMemberPostsCommentsRepliesController } from "./controllers/community/member/posts/comments/replies/CommunityMemberPostsCommentsRepliesController";
import { CommunityMemberPostsCommentsVotesController } from "./controllers/community/member/posts/comments/votes/CommunityMemberPostsCommentsVotesController";
import { CommunityMemberPostsVotesController } from "./controllers/community/member/posts/votes/CommunityMemberPostsVotesController";
import { CommunityMemberProfileController } from "./controllers/community/member/profile/CommunityMemberProfileController";
import { CommunityMemberSubscriptionsController } from "./controllers/community/member/subscriptions/CommunityMemberSubscriptionsController";
import { CommunityMembersController } from "./controllers/community/members/CommunityMembersController";
import { CommunityPostsController } from "./controllers/community/posts/CommunityPostsController";
import { CommunityPostsCommentsController } from "./controllers/community/posts/comments/CommunityPostsCommentsController";
import { CommunityPostsCommentsVotesController } from "./controllers/community/posts/comments/votes/CommunityPostsCommentsVotesController";
import { CommunityUserprofilesController } from "./controllers/community/userProfiles/CommunityUserprofilesController";
import { CommunityUserprofilesCommentsController } from "./controllers/community/userProfiles/comments/CommunityUserprofilesCommentsController";
import { CommunityUserprofilesKarmalogsController } from "./controllers/community/userProfiles/karmaLogs/CommunityUserprofilesKarmalogsController";
import { CommunityUserprofilesPostsController } from "./controllers/community/userProfiles/posts/CommunityUserprofilesPostsController";

@Module({
  controllers: [
    CommunityAuthGuestController,
    CommunityAuthMemberController,
    CommunityGuestsController,
    CommunityGuestSessionsController,
    CommunityMembersController,
    CommunityMemberProfileController,
    CommunityUserprofilesController,
    CommunityUserprofilesKarmalogsController,
    CommunityCommunitiesController,
    CommunityMemberCommunitiesController,
    CommunityCommunitiesModeratorsController,
    CommunityMemberCommunitiesModeratorsController,
    CommunityMemberCommunitiesSubscriptionsController,
    CommunityMemberSubscriptionsController,
    CommunityMemberCommunitiesBansController,
    CommunityPostsController,
    CommunityCommunitiesPostsController,
    CommunityMemberCommunitiesPostsController,
    CommunityMemberPostsController,
    CommunityMemberPostsVotesController,
    CommunityPostsCommentsController,
    CommunityMemberPostsCommentsController,
    CommunityPostsCommentsVotesController,
    CommunityMemberPostsCommentsVotesController,
    CommunityMemberCommunitiesReportsController,
    CommunityUserprofilesPostsController,
    CommunityUserprofilesCommentsController,
    CommunityMemberFeedController,
    CommunityGuestPostsCommentsRepliesController,
    CommunityMemberPostsCommentsRepliesController,
  ],
})
export class MyModule {}
