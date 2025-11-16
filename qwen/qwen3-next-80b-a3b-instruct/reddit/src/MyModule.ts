import { Module } from "@nestjs/common";

import { AuthGuestController } from "./controllers/auth/guest/AuthGuestController";
import { AuthMemberController } from "./controllers/auth/member/AuthMemberController";
import { AuthModeratorController } from "./controllers/auth/moderator/AuthModeratorController";
import { CommunityplatformAdminGuestsController } from "./controllers/communityPlatform/admin/guests/CommunityplatformAdminGuestsController";
import { CommunityplatformModeratorGuestsController } from "./controllers/communityPlatform/moderator/guests/CommunityplatformModeratorGuestsController";
import { CommunityplatformMembersController } from "./controllers/communityPlatform/members/CommunityplatformMembersController";
import { CommunityplatformAdminModeratorsController } from "./controllers/communityPlatform/admin/moderators/CommunityplatformAdminModeratorsController";
import { CommunityplatformAdminAdminsController } from "./controllers/communityPlatform/admin/admins/CommunityplatformAdminAdminsController";
import { CommunityplatformCommunitiesController } from "./controllers/communityPlatform/communities/CommunityplatformCommunitiesController";
import { CommunityplatformMemberCommunitiesController } from "./controllers/communityPlatform/member/communities/CommunityplatformMemberCommunitiesController";
import { CommunityplatformAdminCommunitiesController } from "./controllers/communityPlatform/admin/communities/CommunityplatformAdminCommunitiesController";
import { CommunityplatformCommunitiesPostsController } from "./controllers/communityPlatform/communities/posts/CommunityplatformCommunitiesPostsController";
import { CommunityplatformMemberCommunitiesPostsController } from "./controllers/communityPlatform/member/communities/posts/CommunityplatformMemberCommunitiesPostsController";
import { CommunityplatformCommunitiesPostsCommentsController } from "./controllers/communityPlatform/communities/posts/comments/CommunityplatformCommunitiesPostsCommentsController";
import { CommunityplatformMemberCommunitiesPostsCommentsController } from "./controllers/communityPlatform/member/communities/posts/comments/CommunityplatformMemberCommunitiesPostsCommentsController";
import { CommunityplatformMemberCommunitiesPostsVotesController } from "./controllers/communityPlatform/member/communities/posts/votes/CommunityplatformMemberCommunitiesPostsVotesController";
import { CommunityplatformModeratorCommunitiesPostsVotesController } from "./controllers/communityPlatform/moderator/communities/posts/votes/CommunityplatformModeratorCommunitiesPostsVotesController";
import { CommunityplatformAdminCommunitiesPostsVotesController } from "./controllers/communityPlatform/admin/communities/posts/votes/CommunityplatformAdminCommunitiesPostsVotesController";
import { CommunityplatformMemberCommunitiesPostsCommentsVotesController } from "./controllers/communityPlatform/member/communities/posts/comments/votes/CommunityplatformMemberCommunitiesPostsCommentsVotesController";
import { CommunityplatformModeratorCommunitiesPostsCommentsVotesController } from "./controllers/communityPlatform/moderator/communities/posts/comments/votes/CommunityplatformModeratorCommunitiesPostsCommentsVotesController";
import { CommunityplatformAdminCommunitiesPostsCommentsVotesController } from "./controllers/communityPlatform/admin/communities/posts/comments/votes/CommunityplatformAdminCommunitiesPostsCommentsVotesController";
import { CommunitiesPostsCommentsVotesController } from "./controllers/communities/posts/comments/votes/CommunitiesPostsCommentsVotesController";
import { CommunityplatformModeratorReportsController } from "./controllers/communityPlatform/moderator/reports/CommunityplatformModeratorReportsController";
import { CommunityplatformAdminReportsController } from "./controllers/communityPlatform/admin/reports/CommunityplatformAdminReportsController";
import { CommunityplatformMemberReportsController } from "./controllers/communityPlatform/member/reports/CommunityplatformMemberReportsController";
import { CommunityplatformReportsController } from "./controllers/communityPlatform/reports/CommunityplatformReportsController";
import { CommunityplatformMemberKarmaTrackerController } from "./controllers/communityPlatform/member/karma/tracker/CommunityplatformMemberKarmaTrackerController";
import { CommunityplatformAdminKarmaTrackerController } from "./controllers/communityPlatform/admin/karma/tracker/CommunityplatformAdminKarmaTrackerController";
import { CommunityplatformMemberKarmaPostController } from "./controllers/communityPlatform/member/karma/post/CommunityplatformMemberKarmaPostController";
import { CommunityplatformMemberKarmaCommentController } from "./controllers/communityPlatform/member/karma/comment/CommunityplatformMemberKarmaCommentController";
import { CommunityplatformKarmaDecayController } from "./controllers/communityPlatform/karma/decay/CommunityplatformKarmaDecayController";
import { CommunityplatformAdminKarmaDecayController } from "./controllers/communityPlatform/admin/karma/decay/CommunityplatformAdminKarmaDecayController";
import { CommunityplatformMemberNotificationsController } from "./controllers/communityPlatform/member/notifications/CommunityplatformMemberNotificationsController";
import { CommunityplatformAdminNotificationsController } from "./controllers/communityPlatform/admin/notifications/CommunityplatformAdminNotificationsController";
import { CommunityplatformMemberNotification_preferencesController } from "./controllers/communityPlatform/member/notification-preferences/CommunityplatformMemberNotification_preferencesController";
import { CommunityplatformAdminNotification_preferencesController } from "./controllers/communityPlatform/admin/notification-preferences/CommunityplatformAdminNotification_preferencesController";
import { CommunityplatformAdminPaymentsLogsController } from "./controllers/communityPlatform/admin/payments/logs/CommunityplatformAdminPaymentsLogsController";
import { CommunityplatformAdminPayoutsController } from "./controllers/communityPlatform/admin/payouts/CommunityplatformAdminPayoutsController";
import { CommunityplatformAdminCreator_applicationsController } from "./controllers/communityPlatform/admin/creator-applications/CommunityplatformAdminCreator_applicationsController";
import { CommunityplatformMemberCreator_applicationsController } from "./controllers/communityPlatform/member/creator-applications/CommunityplatformMemberCreator_applicationsController";
import { CommunityplatformCreator_applicationsController } from "./controllers/communityPlatform/creator-applications/CommunityplatformCreator_applicationsController";
import { CommunityplatformMemberTipsController } from "./controllers/communityPlatform/member/tips/CommunityplatformMemberTipsController";
import { CommunityplatformTipsController } from "./controllers/communityPlatform/tips/CommunityplatformTipsController";
import { CommunityplatformAdminTipsController } from "./controllers/communityPlatform/admin/tips/CommunityplatformAdminTipsController";
import { CommunityplatformMemberSubscriptionsController } from "./controllers/communityPlatform/member/subscriptions/CommunityplatformMemberSubscriptionsController";
import { CommunityplatformAdminSubscriptionsController } from "./controllers/communityPlatform/admin/subscriptions/CommunityplatformAdminSubscriptionsController";

@Module({
  controllers: [
    AuthGuestController,
    AuthMemberController,
    AuthModeratorController,
    CommunityplatformAdminGuestsController,
    CommunityplatformModeratorGuestsController,
    CommunityplatformMembersController,
    CommunityplatformAdminModeratorsController,
    CommunityplatformAdminAdminsController,
    CommunityplatformCommunitiesController,
    CommunityplatformMemberCommunitiesController,
    CommunityplatformAdminCommunitiesController,
    CommunityplatformCommunitiesPostsController,
    CommunityplatformMemberCommunitiesPostsController,
    CommunityplatformCommunitiesPostsCommentsController,
    CommunityplatformMemberCommunitiesPostsCommentsController,
    CommunityplatformMemberCommunitiesPostsVotesController,
    CommunityplatformModeratorCommunitiesPostsVotesController,
    CommunityplatformAdminCommunitiesPostsVotesController,
    CommunityplatformMemberCommunitiesPostsCommentsVotesController,
    CommunityplatformModeratorCommunitiesPostsCommentsVotesController,
    CommunityplatformAdminCommunitiesPostsCommentsVotesController,
    CommunitiesPostsCommentsVotesController,
    CommunityplatformModeratorReportsController,
    CommunityplatformAdminReportsController,
    CommunityplatformMemberReportsController,
    CommunityplatformReportsController,
    CommunityplatformMemberKarmaTrackerController,
    CommunityplatformAdminKarmaTrackerController,
    CommunityplatformMemberKarmaPostController,
    CommunityplatformMemberKarmaCommentController,
    CommunityplatformKarmaDecayController,
    CommunityplatformAdminKarmaDecayController,
    CommunityplatformMemberNotificationsController,
    CommunityplatformAdminNotificationsController,
    CommunityplatformMemberNotification_preferencesController,
    CommunityplatformAdminNotification_preferencesController,
    CommunityplatformAdminPaymentsLogsController,
    CommunityplatformAdminPayoutsController,
    CommunityplatformAdminCreator_applicationsController,
    CommunityplatformMemberCreator_applicationsController,
    CommunityplatformCreator_applicationsController,
    CommunityplatformMemberTipsController,
    CommunityplatformTipsController,
    CommunityplatformAdminTipsController,
    CommunityplatformMemberSubscriptionsController,
    CommunityplatformAdminSubscriptionsController,
  ],
})
export class MyModule {}
