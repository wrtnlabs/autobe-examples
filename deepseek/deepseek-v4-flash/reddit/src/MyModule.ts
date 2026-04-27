import { Module } from "@nestjs/common";

import { CommunityplatformAuthGuestController } from "./controllers/communityPlatform/auth/guest/CommunityplatformAuthGuestController";
import { CommunityplatformAuthMemberController } from "./controllers/communityPlatform/auth/member/CommunityplatformAuthMemberController";
import { CommunityplatformCommunitiesController } from "./controllers/communityPlatform/communities/CommunityplatformCommunitiesController";
import { CommunityplatformCommunitiesAppointed_moderatorsController } from "./controllers/communityPlatform/communities/appointed-moderators/CommunityplatformCommunitiesAppointed_moderatorsController";
import { CommunityplatformCommunitiesImagesController } from "./controllers/communityPlatform/communities/images/CommunityplatformCommunitiesImagesController";
import { CommunityplatformCommunitiesPostsFeedsController } from "./controllers/communityPlatform/communities/posts/feeds/CommunityplatformCommunitiesPostsFeedsController";
import { CommunityplatformCommunitiesSubscribersController } from "./controllers/communityPlatform/communities/subscribers/CommunityplatformCommunitiesSubscribersController";
import { CommunityplatformGuestPostsController } from "./controllers/communityPlatform/guest/posts/CommunityplatformGuestPostsController";
import { CommunityplatformGuestProfilesCommentsController } from "./controllers/communityPlatform/guest/profiles/comments/CommunityplatformGuestProfilesCommentsController";
import { CommunityplatformGuestProfilesPostsController } from "./controllers/communityPlatform/guest/profiles/posts/CommunityplatformGuestProfilesPostsController";
import { CommunityplatformGuestVote_summariesController } from "./controllers/communityPlatform/guest/vote-summaries/CommunityplatformGuestVote_summariesController";
import { CommunityplatformMemberBansController } from "./controllers/communityPlatform/member/bans/CommunityplatformMemberBansController";
import { CommunityplatformMemberCommunitiesController } from "./controllers/communityPlatform/member/communities/CommunityplatformMemberCommunitiesController";
import { CommunityplatformMemberCommunitiesBansController } from "./controllers/communityPlatform/member/communities/bans/CommunityplatformMemberCommunitiesBansController";
import { CommunityplatformMemberCommunitiesImagesController } from "./controllers/communityPlatform/member/communities/images/CommunityplatformMemberCommunitiesImagesController";
import { CommunityplatformMemberCommunitiesSnapshotsController } from "./controllers/communityPlatform/member/communities/snapshots/CommunityplatformMemberCommunitiesSnapshotsController";
import { CommunityplatformMemberCommunitiesSubscribersController } from "./controllers/communityPlatform/member/communities/subscribers/CommunityplatformMemberCommunitiesSubscribersController";
import { CommunityplatformMemberCommunity_bansController } from "./controllers/communityPlatform/member/community-bans/CommunityplatformMemberCommunity_bansController";
import { CommunityplatformMemberCommunity_reportsController } from "./controllers/communityPlatform/member/community-reports/CommunityplatformMemberCommunity_reportsController";
import { CommunityplatformMemberCommunityreportsController } from "./controllers/communityPlatform/member/communityReports/CommunityplatformMemberCommunityreportsController";
import { CommunityplatformMemberEmail_verificationsController } from "./controllers/communityPlatform/member/email-verifications/CommunityplatformMemberEmail_verificationsController";
import { CommunityplatformMemberController } from "./controllers/communityPlatform/member/logout/CommunityplatformMemberController";
import { CommunityplatformMemberModeratorsController } from "./controllers/communityPlatform/member/moderators/CommunityplatformMemberModeratorsController";
import { CommunityplatformMemberPassword_resetsController } from "./controllers/communityPlatform/member/password-resets/CommunityplatformMemberPassword_resetsController";
import { CommunityplatformMemberPasswordController } from "./controllers/communityPlatform/member/password/change/CommunityplatformMemberPasswordController";
import { CommunityplatformMemberPostsController } from "./controllers/communityPlatform/member/posts/CommunityplatformMemberPostsController";
import { CommunityplatformMemberPostsCommentsController } from "./controllers/communityPlatform/member/posts/comments/CommunityplatformMemberPostsCommentsController";
import { CommunityplatformMemberPostsCommentsVotesController } from "./controllers/communityPlatform/member/posts/comments/votes/CommunityplatformMemberPostsCommentsVotesController";
import { CommunityplatformMemberPostsFeedsHomeController } from "./controllers/communityPlatform/member/posts/feeds/home/CommunityplatformMemberPostsFeedsHomeController";
import { CommunityplatformMemberProfileController } from "./controllers/communityPlatform/member/profile/CommunityplatformMemberProfileController";
import { CommunityplatformMemberProfileSnapshotsController } from "./controllers/communityPlatform/member/profile/snapshots/CommunityplatformMemberProfileSnapshotsController";
import { CommunityplatformMemberProfilesCommentsController } from "./controllers/communityPlatform/member/profiles/comments/CommunityplatformMemberProfilesCommentsController";
import { CommunityplatformMemberProfilesPostsController } from "./controllers/communityPlatform/member/profiles/posts/CommunityplatformMemberProfilesPostsController";
import { CommunityplatformMemberReportsController } from "./controllers/communityPlatform/member/reports/CommunityplatformMemberReportsController";
import { CommunityplatformMemberReportsComment_targetController } from "./controllers/communityPlatform/member/reports/comment-target/CommunityplatformMemberReportsComment_targetController";
import { CommunityplatformMemberReportsPost_targetController } from "./controllers/communityPlatform/member/reports/post-target/CommunityplatformMemberReportsPost_targetController";
import { CommunityplatformMemberSessionsController } from "./controllers/communityPlatform/member/sessions/CommunityplatformMemberSessionsController";
import { CommunityplatformMemberSubscriptionsController } from "./controllers/communityPlatform/member/subscriptions/CommunityplatformMemberSubscriptionsController";
import { CommunityplatformMemberSubscriptionsCommunitiesController } from "./controllers/communityPlatform/member/subscriptions/communities/CommunityplatformMemberSubscriptionsCommunitiesController";
import { CommunityplatformMemberVote_summariesController } from "./controllers/communityPlatform/member/vote-summaries/CommunityplatformMemberVote_summariesController";
import { CommunityplatformMemberVotesController } from "./controllers/communityPlatform/member/votes/CommunityplatformMemberVotesController";
import { CommunityplatformMembersController } from "./controllers/communityPlatform/members/CommunityplatformMembersController";
import { CommunityplatformModeratorsController } from "./controllers/communityPlatform/moderators/CommunityplatformModeratorsController";
import { CommunityplatformPostsCommentsController } from "./controllers/communityPlatform/posts/comments/CommunityplatformPostsCommentsController";
import { CommunityplatformPostsFeedsPopularController } from "./controllers/communityPlatform/posts/feeds/popular/CommunityplatformPostsFeedsPopularController";
import { CommunityplatformProfilesController } from "./controllers/communityPlatform/profiles/CommunityplatformProfilesController";

@Module({
  controllers: [
    CommunityplatformAuthGuestController,
    CommunityplatformAuthMemberController,
    CommunityplatformMembersController,
    CommunityplatformMemberSessionsController,
    CommunityplatformMemberPassword_resetsController,
    CommunityplatformMemberEmail_verificationsController,
    CommunityplatformMemberProfileController,
    CommunityplatformProfilesController,
    CommunityplatformMemberProfileSnapshotsController,
    CommunityplatformCommunitiesController,
    CommunityplatformMemberCommunitiesController,
    CommunityplatformCommunitiesImagesController,
    CommunityplatformMemberCommunitiesImagesController,
    CommunityplatformMemberCommunitiesSnapshotsController,
    CommunityplatformCommunitiesSubscribersController,
    CommunityplatformMemberCommunitiesSubscribersController,
    CommunityplatformMemberSubscriptionsController,
    CommunityplatformGuestPostsController,
    CommunityplatformMemberPostsController,
    CommunityplatformMemberVotesController,
    CommunityplatformGuestVote_summariesController,
    CommunityplatformMemberVote_summariesController,
    CommunityplatformPostsCommentsController,
    CommunityplatformMemberPostsCommentsController,
    CommunityplatformMemberPostsCommentsVotesController,
    CommunityplatformModeratorsController,
    CommunityplatformMemberModeratorsController,
    CommunityplatformCommunitiesAppointed_moderatorsController,
    CommunityplatformMemberCommunitiesBansController,
    CommunityplatformMemberBansController,
    CommunityplatformMemberCommunity_bansController,
    CommunityplatformMemberReportsController,
    CommunityplatformMemberReportsPost_targetController,
    CommunityplatformMemberReportsComment_targetController,
    CommunityplatformMemberCommunity_reportsController,
    CommunityplatformMemberCommunityreportsController,
    CommunityplatformMemberController,
    CommunityplatformMemberPasswordController,
    CommunityplatformGuestProfilesPostsController,
    CommunityplatformMemberProfilesPostsController,
    CommunityplatformGuestProfilesCommentsController,
    CommunityplatformMemberProfilesCommentsController,
    CommunityplatformMemberSubscriptionsCommunitiesController,
    CommunityplatformMemberPostsFeedsHomeController,
    CommunityplatformPostsFeedsPopularController,
    CommunityplatformCommunitiesPostsFeedsController,
  ],
})
export class MyModule {}
