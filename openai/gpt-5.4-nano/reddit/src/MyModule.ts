import { Module } from "@nestjs/common";

import { CommunityplatformAdminAdminsController } from "./controllers/communityPlatform/admin/admins/CommunityplatformAdminAdminsController";
import { CommunityplatformAdminBansController } from "./controllers/communityPlatform/admin/bans/CommunityplatformAdminBansController";
import { CommunityplatformAdminBansSnapshotsController } from "./controllers/communityPlatform/admin/bans/snapshots/CommunityplatformAdminBansSnapshotsController";
import { CommunityplatformAdminPostsController } from "./controllers/communityPlatform/admin/posts/CommunityplatformAdminPostsController";
import { CommunityplatformAdminPostsImagesController } from "./controllers/communityPlatform/admin/posts/images/CommunityplatformAdminPostsImagesController";
import { CommunityplatformAdminPostsLinkController } from "./controllers/communityPlatform/admin/posts/link/CommunityplatformAdminPostsLinkController";
import { CommunityplatformAdminPostsSnapshotsController } from "./controllers/communityPlatform/admin/posts/snapshots/CommunityplatformAdminPostsSnapshotsController";
import { CommunityplatformAdminPostsVotesController } from "./controllers/communityPlatform/admin/posts/votes/CommunityplatformAdminPostsVotesController";
import { CommunityplatformAdminReportsResolutionController } from "./controllers/communityPlatform/admin/reports/resolution/CommunityplatformAdminReportsResolutionController";
import { CommunityplatformAdminReportsSnapshotsController } from "./controllers/communityPlatform/admin/reports/snapshots/CommunityplatformAdminReportsSnapshotsController";
import { CommunityplatformAuthAdminController } from "./controllers/communityPlatform/auth/admin/CommunityplatformAuthAdminController";
import { CommunityplatformAuthGuestJoinController } from "./controllers/communityPlatform/auth/guest/join/CommunityplatformAuthGuestJoinController";
import { CommunityplatformAuthGuestRefreshController } from "./controllers/communityPlatform/auth/guest/refresh/CommunityplatformAuthGuestRefreshController";
import { CommunityplatformAuthMemberController } from "./controllers/communityPlatform/auth/member/CommunityplatformAuthMemberController";
import { CommunityplatformCommunitiesController } from "./controllers/communityPlatform/communities/CommunityplatformCommunitiesController";
import { CommunityplatformCommunitymoderatorsController } from "./controllers/communityPlatform/communityModerators/CommunityplatformCommunitymoderatorsController";
import { CommunityplatformCommunitysubscriptionsController } from "./controllers/communityPlatform/communitySubscriptions/CommunityplatformCommunitysubscriptionsController";
import { CommunityplatformGuestGuestsController } from "./controllers/communityPlatform/guest/guests/CommunityplatformGuestGuestsController";
import { CommunityplatformGuestPostsController } from "./controllers/communityPlatform/guest/posts/CommunityplatformGuestPostsController";
import { CommunityplatformGuestPostsImagesController } from "./controllers/communityPlatform/guest/posts/images/CommunityplatformGuestPostsImagesController";
import { CommunityplatformGuestPostsLinkController } from "./controllers/communityPlatform/guest/posts/link/CommunityplatformGuestPostsLinkController";
import { CommunityplatformGuestPostsSnapshotsController } from "./controllers/communityPlatform/guest/posts/snapshots/CommunityplatformGuestPostsSnapshotsController";
import { CommunityplatformGuestPostsVotesController } from "./controllers/communityPlatform/guest/posts/votes/CommunityplatformGuestPostsVotesController";
import { CommunityplatformGuestProfileController } from "./controllers/communityPlatform/guest/profile/CommunityplatformGuestProfileController";
import { CommunityplatformGuestSessionsController } from "./controllers/communityPlatform/guest/sessions/CommunityplatformGuestSessionsController";
import { CommunityplatformMemberCommunitiesBansController } from "./controllers/communityPlatform/member/communities/bans/CommunityplatformMemberCommunitiesBansController";
import { CommunityplatformMemberCommunitiesReportsActiveController } from "./controllers/communityPlatform/member/communities/reports/active/CommunityplatformMemberCommunitiesReportsActiveController";
import { CommunityplatformMemberMembersController } from "./controllers/communityPlatform/member/members/CommunityplatformMemberMembersController";
import { CommunityplatformMemberPostsController } from "./controllers/communityPlatform/member/posts/CommunityplatformMemberPostsController";
import { CommunityplatformMemberPostsCommentsController } from "./controllers/communityPlatform/member/posts/comments/CommunityplatformMemberPostsCommentsController";
import { CommunityplatformMemberPostsCommentsVotesController } from "./controllers/communityPlatform/member/posts/comments/votes/CommunityplatformMemberPostsCommentsVotesController";
import { CommunityplatformMemberPostsImagesController } from "./controllers/communityPlatform/member/posts/images/CommunityplatformMemberPostsImagesController";
import { CommunityplatformMemberPostsLinkController } from "./controllers/communityPlatform/member/posts/link/CommunityplatformMemberPostsLinkController";
import { CommunityplatformMemberPostsSnapshotsController } from "./controllers/communityPlatform/member/posts/snapshots/CommunityplatformMemberPostsSnapshotsController";
import { CommunityplatformMemberPostsVotesController } from "./controllers/communityPlatform/member/posts/votes/CommunityplatformMemberPostsVotesController";
import { CommunityplatformMemberProfileController } from "./controllers/communityPlatform/member/profile/CommunityplatformMemberProfileController";
import { CommunityplatformMemberProfilesController } from "./controllers/communityPlatform/member/profiles/CommunityplatformMemberProfilesController";
import { CommunityplatformMemberReportsController } from "./controllers/communityPlatform/member/reports/CommunityplatformMemberReportsController";
import { CommunityplatformMemberReportsDecisionsApproveController } from "./controllers/communityPlatform/member/reports/decisions/approve/CommunityplatformMemberReportsDecisionsApproveController";
import { CommunityplatformMemberReportsDecisionsDismissController } from "./controllers/communityPlatform/member/reports/decisions/dismiss/CommunityplatformMemberReportsDecisionsDismissController";
import { CommunityplatformMemberReportsTargetsController } from "./controllers/communityPlatform/member/reports/targets/CommunityplatformMemberReportsTargetsController";
import { CommunityplatformProfilesController } from "./controllers/communityPlatform/profiles/CommunityplatformProfilesController";

@Module({
  controllers: [
    CommunityplatformAuthGuestJoinController,
    CommunityplatformAuthGuestRefreshController,
    CommunityplatformAuthMemberController,
    CommunityplatformAuthAdminController,
    CommunityplatformGuestSessionsController,
    CommunityplatformGuestGuestsController,
    CommunityplatformGuestProfileController,
    CommunityplatformMemberMembersController,
    CommunityplatformAdminAdminsController,
    CommunityplatformProfilesController,
    CommunityplatformMemberProfilesController,
    CommunityplatformMemberProfileController,
    CommunityplatformCommunitiesController,
    CommunityplatformCommunitysubscriptionsController,
    CommunityplatformCommunitymoderatorsController,
    CommunityplatformGuestPostsController,
    CommunityplatformMemberPostsController,
    CommunityplatformAdminPostsController,
    CommunityplatformGuestPostsImagesController,
    CommunityplatformMemberPostsImagesController,
    CommunityplatformAdminPostsImagesController,
    CommunityplatformGuestPostsLinkController,
    CommunityplatformMemberPostsLinkController,
    CommunityplatformAdminPostsLinkController,
    CommunityplatformGuestPostsSnapshotsController,
    CommunityplatformMemberPostsSnapshotsController,
    CommunityplatformAdminPostsSnapshotsController,
    CommunityplatformGuestPostsVotesController,
    CommunityplatformMemberPostsVotesController,
    CommunityplatformAdminPostsVotesController,
    CommunityplatformMemberPostsCommentsController,
    CommunityplatformMemberPostsCommentsVotesController,
    CommunityplatformMemberReportsController,
    CommunityplatformMemberReportsTargetsController,
    CommunityplatformAdminReportsResolutionController,
    CommunityplatformAdminReportsSnapshotsController,
    CommunityplatformAdminBansController,
    CommunityplatformAdminBansSnapshotsController,
    CommunityplatformMemberCommunitiesReportsActiveController,
    CommunityplatformMemberReportsDecisionsApproveController,
    CommunityplatformMemberReportsDecisionsDismissController,
    CommunityplatformMemberCommunitiesBansController,
  ],
})
export class MyModule {}
