import { Module } from "@nestjs/common";

import { AuthGuestController } from "./controllers/auth/guest/AuthGuestController";
import { GuestController } from "./controllers/guest/verify/GuestController";
import { AuthMemberController } from "./controllers/auth/member/AuthMemberController";
import { MemberController } from "./controllers/member/profile/MemberController";
import { AuthAdminController } from "./controllers/auth/admin/AuthAdminController";
import { AdminController } from "./controllers/admin/me/AdminController";
import { DiscussionboardAdminConfigsController } from "./controllers/discussionBoard/admin/configs/DiscussionboardAdminConfigsController";
import { DiscussionboardMemberChannelsController } from "./controllers/discussionBoard/member/channels/DiscussionboardMemberChannelsController";
import { DiscussionboardChannelsController } from "./controllers/discussionBoard/channels/DiscussionboardChannelsController";
import { DiscussionboardAdminChannelsController } from "./controllers/discussionBoard/admin/channels/DiscussionboardAdminChannelsController";
import { DiscussionboardMemberMembersController } from "./controllers/discussionBoard/member/members/DiscussionboardMemberMembersController";
import { DiscussionboardAdminMembersController } from "./controllers/discussionBoard/admin/members/DiscussionboardAdminMembersController";
import { DiscussionboardAdminAdminsController } from "./controllers/discussionBoard/admin/admins/DiscussionboardAdminAdminsController";
import { DiscussionboardAdminDiscussion_boardAdminsController } from "./controllers/discussionBoard/admin/discussion-board/admins/DiscussionboardAdminDiscussion_boardAdminsController";
import { DiscussionboardMemberMembersSessionsController } from "./controllers/discussionBoard/member/members/sessions/DiscussionboardMemberMembersSessionsController";
import { DiscussionboardAdminMembersSessionsController } from "./controllers/discussionBoard/admin/members/sessions/DiscussionboardAdminMembersSessionsController";
import { DiscussionboardAdminAdminsSessionsController } from "./controllers/discussionBoard/admin/admins/sessions/DiscussionboardAdminAdminsSessionsController";
import { DiscussionboardArticlesController } from "./controllers/discussionBoard/articles/DiscussionboardArticlesController";
import { DiscussionboardMemberArticlesController } from "./controllers/discussionBoard/member/articles/DiscussionboardMemberArticlesController";
import { DiscussionboardMemberArticlesImagesController } from "./controllers/discussionBoard/member/articles/images/DiscussionboardMemberArticlesImagesController";
import { DiscussionboardAdminArticlesImagesController } from "./controllers/discussionBoard/admin/articles/images/DiscussionboardAdminArticlesImagesController";
import { DiscussionboardMemberArticlesFilesController } from "./controllers/discussionBoard/member/articles/files/DiscussionboardMemberArticlesFilesController";
import { DiscussionboardAdminArticlesFilesController } from "./controllers/discussionBoard/admin/articles/files/DiscussionboardAdminArticlesFilesController";
import { DiscussionboardGuestArticlesFilesController } from "./controllers/discussionBoard/guest/articles/files/DiscussionboardGuestArticlesFilesController";
import { DiscussionboardAdminModerationQueuesController } from "./controllers/discussionBoard/admin/moderation/queues/DiscussionboardAdminModerationQueuesController";
import { DiscussionboardAdminModerationQueuesActionsController } from "./controllers/discussionBoard/admin/moderation/queues/actions/DiscussionboardAdminModerationQueuesActionsController";
import { DiscussionboardAnalyticsArticlesMonthlyController } from "./controllers/discussionBoard/analytics/articles/monthly/DiscussionboardAnalyticsArticlesMonthlyController";
import { DiscussionboardAdminDashboardAdminModerationController } from "./controllers/discussionBoard/admin/dashboard/admin/moderation/DiscussionboardAdminDashboardAdminModerationController";
import { DiscussionboardSearchArticlesController } from "./controllers/discussionBoard/search/articles/DiscussionboardSearchArticlesController";
import { DiscussionboardAdminDashboardModerationController } from "./controllers/discussionBoard/admin/dashboard/moderation/overview/DiscussionboardAdminDashboardModerationController";
import { DiscussionboardAdminAnalyticsModerationActionsController } from "./controllers/discussionBoard/admin/analytics/moderation/actions/DiscussionboardAdminAnalyticsModerationActionsController";
import { DiscussionboardAdminModerationQueuesApprove_allController } from "./controllers/discussionBoard/admin/moderation/queues/approve-all/DiscussionboardAdminModerationQueuesApprove_allController";

@Module({
  controllers: [
    AuthGuestController,
    GuestController,
    AuthMemberController,
    MemberController,
    AuthAdminController,
    AdminController,
    DiscussionboardAdminConfigsController,
    DiscussionboardMemberChannelsController,
    DiscussionboardChannelsController,
    DiscussionboardAdminChannelsController,
    DiscussionboardMemberMembersController,
    DiscussionboardAdminMembersController,
    DiscussionboardAdminAdminsController,
    DiscussionboardAdminDiscussion_boardAdminsController,
    DiscussionboardMemberMembersSessionsController,
    DiscussionboardAdminMembersSessionsController,
    DiscussionboardAdminAdminsSessionsController,
    DiscussionboardArticlesController,
    DiscussionboardMemberArticlesController,
    DiscussionboardMemberArticlesImagesController,
    DiscussionboardAdminArticlesImagesController,
    DiscussionboardMemberArticlesFilesController,
    DiscussionboardAdminArticlesFilesController,
    DiscussionboardGuestArticlesFilesController,
    DiscussionboardAdminModerationQueuesController,
    DiscussionboardAdminModerationQueuesActionsController,
    DiscussionboardAnalyticsArticlesMonthlyController,
    DiscussionboardAdminDashboardAdminModerationController,
    DiscussionboardSearchArticlesController,
    DiscussionboardAdminDashboardModerationController,
    DiscussionboardAdminAnalyticsModerationActionsController,
    DiscussionboardAdminModerationQueuesApprove_allController,
  ],
})
export class MyModule {}
