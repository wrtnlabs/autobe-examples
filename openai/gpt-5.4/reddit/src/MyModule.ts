import { Module } from "@nestjs/common";

import { CommunityplatformAdminCommunitiesBansController } from "./controllers/communityPlatform/admin/communities/bans/CommunityplatformAdminCommunitiesBansController";
import { CommunityplatformAdminCommunitiesBansSnapshotsController } from "./controllers/communityPlatform/admin/communities/bans/snapshots/CommunityplatformAdminCommunitiesBansSnapshotsController";
import { CommunityplatformAdminCommunitiesModerationactionsController } from "./controllers/communityPlatform/admin/communities/moderationActions/CommunityplatformAdminCommunitiesModerationactionsController";
import { CommunityplatformAdminCommunitiesModerationactionsBansController } from "./controllers/communityPlatform/admin/communities/moderationActions/bans/CommunityplatformAdminCommunitiesModerationactionsBansController";
import { CommunityplatformAdminCommunitiesModerationactionsCommentsController } from "./controllers/communityPlatform/admin/communities/moderationActions/comments/CommunityplatformAdminCommunitiesModerationactionsCommentsController";
import { CommunityplatformAdminCommunitiesModerationactionsPostsController } from "./controllers/communityPlatform/admin/communities/moderationActions/posts/CommunityplatformAdminCommunitiesModerationactionsPostsController";
import { CommunityplatformAdminCommunitiesModerationactionsReportsController } from "./controllers/communityPlatform/admin/communities/moderationActions/reports/CommunityplatformAdminCommunitiesModerationactionsReportsController";
import { CommunityplatformAdminEmail_verificationsController } from "./controllers/communityPlatform/admin/email-verifications/CommunityplatformAdminEmail_verificationsController";
import { CommunityplatformAdminPassword_resetsController } from "./controllers/communityPlatform/admin/password-resets/CommunityplatformAdminPassword_resetsController";
import { CommunityplatformAdminPostsCommentsController } from "./controllers/communityPlatform/admin/posts/comments/CommunityplatformAdminPostsCommentsController";
import { CommunityplatformAdminPostsCommentsFilesController } from "./controllers/communityPlatform/admin/posts/comments/files/CommunityplatformAdminPostsCommentsFilesController";
import { CommunityplatformAdminPostsCommentsSnapshotsController } from "./controllers/communityPlatform/admin/posts/comments/snapshots/CommunityplatformAdminPostsCommentsSnapshotsController";
import { CommunityplatformAdminPostsCommentsSnapshotsFilesController } from "./controllers/communityPlatform/admin/posts/comments/snapshots/files/CommunityplatformAdminPostsCommentsSnapshotsFilesController";
import { CommunityplatformAdminsController } from "./controllers/communityPlatform/admins/CommunityplatformAdminsController";
import { CommunityplatformAuthAdminController } from "./controllers/communityPlatform/auth/admin/CommunityplatformAuthAdminController";
import { CommunityplatformAuthGuestController } from "./controllers/communityPlatform/auth/guest/CommunityplatformAuthGuestController";
import { CommunityplatformAuthMemberController } from "./controllers/communityPlatform/auth/member/CommunityplatformAuthMemberController";
import { CommunityplatformCommunitiesController } from "./controllers/communityPlatform/communities/CommunityplatformCommunitiesController";
import { CommunityplatformCommunitiesPostsController } from "./controllers/communityPlatform/communities/posts/CommunityplatformCommunitiesPostsController";
import { CommunityplatformCommunitiesSnapshotsController } from "./controllers/communityPlatform/communities/snapshots/CommunityplatformCommunitiesSnapshotsController";
import { CommunityplatformGuestsessionsController } from "./controllers/communityPlatform/guestSessions/CommunityplatformGuestsessionsController";
import { CommunityplatformGuestsController } from "./controllers/communityPlatform/guests/CommunityplatformGuestsController";
import { CommunityplatformMemberCommentsVotesController } from "./controllers/communityPlatform/member/comments/votes/CommunityplatformMemberCommentsVotesController";
import { CommunityplatformMemberCommunitiesController } from "./controllers/communityPlatform/member/communities/CommunityplatformMemberCommunitiesController";
import { CommunityplatformMemberCommunitiesModerationactionsController } from "./controllers/communityPlatform/member/communities/moderationActions/CommunityplatformMemberCommunitiesModerationactionsController";
import { CommunityplatformMemberCommunitiesModerationactionsBansController } from "./controllers/communityPlatform/member/communities/moderationActions/bans/CommunityplatformMemberCommunitiesModerationactionsBansController";
import { CommunityplatformMemberCommunitiesModerationactionsCommentsController } from "./controllers/communityPlatform/member/communities/moderationActions/comments/CommunityplatformMemberCommunitiesModerationactionsCommentsController";
import { CommunityplatformMemberCommunitiesModerationactionsPostsController } from "./controllers/communityPlatform/member/communities/moderationActions/posts/CommunityplatformMemberCommunitiesModerationactionsPostsController";
import { CommunityplatformMemberCommunitiesModerationactionsReportsController } from "./controllers/communityPlatform/member/communities/moderationActions/reports/CommunityplatformMemberCommunitiesModerationactionsReportsController";
import { CommunityplatformMemberCommunitiesModeratorsController } from "./controllers/communityPlatform/member/communities/moderators/CommunityplatformMemberCommunitiesModeratorsController";
import { CommunityplatformMemberCommunitiesModeratorsOwnersController } from "./controllers/communityPlatform/member/communities/moderators/owners/CommunityplatformMemberCommunitiesModeratorsOwnersController";
import { CommunityplatformMemberCommunitiesModeratorsSnapshotsController } from "./controllers/communityPlatform/member/communities/moderators/snapshots/CommunityplatformMemberCommunitiesModeratorsSnapshotsController";
import { CommunityplatformMemberCommunitiesReportsController } from "./controllers/communityPlatform/member/communities/reports/CommunityplatformMemberCommunitiesReportsController";
import { CommunityplatformMemberCommunitiesReportsReviewsController } from "./controllers/communityPlatform/member/communities/reports/reviews/CommunityplatformMemberCommunitiesReportsReviewsController";
import { CommunityplatformMemberCommunitiesSnapshotsController } from "./controllers/communityPlatform/member/communities/snapshots/CommunityplatformMemberCommunitiesSnapshotsController";
import { CommunityplatformMemberCommunitiesSubscriptionController } from "./controllers/communityPlatform/member/communities/subscription/CommunityplatformMemberCommunitiesSubscriptionController";
import { CommunityplatformMemberPostvotesController } from "./controllers/communityPlatform/member/postVotes/CommunityplatformMemberPostvotesController";
import { CommunityplatformMemberPostsController } from "./controllers/communityPlatform/member/posts/CommunityplatformMemberPostsController";
import { CommunityplatformMemberPostsCommentsController } from "./controllers/communityPlatform/member/posts/comments/CommunityplatformMemberPostsCommentsController";
import { CommunityplatformMemberPostsCommentsFilesController } from "./controllers/communityPlatform/member/posts/comments/files/CommunityplatformMemberPostsCommentsFilesController";
import { CommunityplatformMemberPostsCommentsSnapshotsController } from "./controllers/communityPlatform/member/posts/comments/snapshots/CommunityplatformMemberPostsCommentsSnapshotsController";
import { CommunityplatformMemberPostsCommentsSnapshotsFilesController } from "./controllers/communityPlatform/member/posts/comments/snapshots/files/CommunityplatformMemberPostsCommentsSnapshotsFilesController";
import { CommunityplatformMemberPostsImagesController } from "./controllers/communityPlatform/member/posts/images/CommunityplatformMemberPostsImagesController";
import { CommunityplatformMemberPostsLinksController } from "./controllers/communityPlatform/member/posts/links/CommunityplatformMemberPostsLinksController";
import { CommunityplatformMemberPostsSnapshotsController } from "./controllers/communityPlatform/member/posts/snapshots/CommunityplatformMemberPostsSnapshotsController";
import { CommunityplatformMemberPostsTextsController } from "./controllers/communityPlatform/member/posts/texts/CommunityplatformMemberPostsTextsController";
import { CommunityplatformMemberPostsVotesController } from "./controllers/communityPlatform/member/posts/votes/CommunityplatformMemberPostsVotesController";
import { CommunityplatformMemberProfileController } from "./controllers/communityPlatform/member/profile/CommunityplatformMemberProfileController";
import { CommunityplatformMemberProfilesFilesController } from "./controllers/communityPlatform/member/profiles/files/CommunityplatformMemberProfilesFilesController";
import { CommunityplatformMemberReportsController } from "./controllers/communityPlatform/member/reports/CommunityplatformMemberReportsController";
import { CommunityplatformMemberSessionsController } from "./controllers/communityPlatform/member/sessions/CommunityplatformMemberSessionsController";
import { CommunityplatformMemberSubscriptionsController } from "./controllers/communityPlatform/member/subscriptions/CommunityplatformMemberSubscriptionsController";
import { CommunityplatformMemberVotesController } from "./controllers/communityPlatform/member/votes/CommunityplatformMemberVotesController";
import { CommunityplatformMembersController } from "./controllers/communityPlatform/members/CommunityplatformMembersController";
import { CommunityplatformPostsController } from "./controllers/communityPlatform/posts/CommunityplatformPostsController";
import { CommunityplatformPostsCommentsController } from "./controllers/communityPlatform/posts/comments/CommunityplatformPostsCommentsController";
import { CommunityplatformPostsImagesController } from "./controllers/communityPlatform/posts/images/CommunityplatformPostsImagesController";
import { CommunityplatformPostsLinksController } from "./controllers/communityPlatform/posts/links/CommunityplatformPostsLinksController";
import { CommunityplatformPostsSnapshotsController } from "./controllers/communityPlatform/posts/snapshots/CommunityplatformPostsSnapshotsController";
import { CommunityplatformPostsTextsController } from "./controllers/communityPlatform/posts/texts/CommunityplatformPostsTextsController";
import { CommunityplatformProfilesController } from "./controllers/communityPlatform/profiles/CommunityplatformProfilesController";

@Module({
  controllers: [
    CommunityplatformAuthGuestController,
    CommunityplatformAuthMemberController,
    CommunityplatformAuthAdminController,
    CommunityplatformMembersController,
    CommunityplatformMemberProfileController,
    CommunityplatformMemberSessionsController,
    CommunityplatformGuestsController,
    CommunityplatformGuestsessionsController,
    CommunityplatformAdminsController,
    CommunityplatformAdminPassword_resetsController,
    CommunityplatformAdminEmail_verificationsController,
    CommunityplatformProfilesController,
    CommunityplatformMemberProfilesFilesController,
    CommunityplatformCommunitiesController,
    CommunityplatformMemberCommunitiesController,
    CommunityplatformCommunitiesSnapshotsController,
    CommunityplatformMemberCommunitiesSnapshotsController,
    CommunityplatformMemberCommunitiesSubscriptionController,
    CommunityplatformMemberSubscriptionsController,
    CommunityplatformPostsController,
    CommunityplatformMemberPostsController,
    CommunityplatformCommunitiesPostsController,
    CommunityplatformPostsSnapshotsController,
    CommunityplatformMemberPostsSnapshotsController,
    CommunityplatformPostsTextsController,
    CommunityplatformMemberPostsTextsController,
    CommunityplatformPostsLinksController,
    CommunityplatformMemberPostsLinksController,
    CommunityplatformPostsImagesController,
    CommunityplatformMemberPostsImagesController,
    CommunityplatformPostsCommentsController,
    CommunityplatformMemberPostsCommentsController,
    CommunityplatformAdminPostsCommentsController,
    CommunityplatformMemberPostsCommentsFilesController,
    CommunityplatformAdminPostsCommentsFilesController,
    CommunityplatformMemberPostsCommentsSnapshotsController,
    CommunityplatformAdminPostsCommentsSnapshotsController,
    CommunityplatformMemberPostsCommentsSnapshotsFilesController,
    CommunityplatformAdminPostsCommentsSnapshotsFilesController,
    CommunityplatformMemberPostvotesController,
    CommunityplatformMemberVotesController,
    CommunityplatformMemberPostsVotesController,
    CommunityplatformMemberCommentsVotesController,
    CommunityplatformMemberCommunitiesModeratorsController,
    CommunityplatformMemberCommunitiesModeratorsSnapshotsController,
    CommunityplatformMemberCommunitiesModeratorsOwnersController,
    CommunityplatformAdminCommunitiesBansController,
    CommunityplatformAdminCommunitiesBansSnapshotsController,
    CommunityplatformMemberReportsController,
    CommunityplatformMemberCommunitiesReportsController,
    CommunityplatformMemberCommunitiesReportsReviewsController,
    CommunityplatformMemberCommunitiesModerationactionsController,
    CommunityplatformAdminCommunitiesModerationactionsController,
    CommunityplatformMemberCommunitiesModerationactionsPostsController,
    CommunityplatformAdminCommunitiesModerationactionsPostsController,
    CommunityplatformMemberCommunitiesModerationactionsCommentsController,
    CommunityplatformAdminCommunitiesModerationactionsCommentsController,
    CommunityplatformMemberCommunitiesModerationactionsBansController,
    CommunityplatformAdminCommunitiesModerationactionsBansController,
    CommunityplatformMemberCommunitiesModerationactionsReportsController,
    CommunityplatformAdminCommunitiesModerationactionsReportsController,
  ],
})
export class MyModule {}
