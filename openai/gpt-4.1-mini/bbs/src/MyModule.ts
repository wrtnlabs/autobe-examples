import { Module } from "@nestjs/common";

import { AuthGuestJoinController } from "./controllers/auth/guest/join/AuthGuestJoinController";
import { AuthGuestRefreshController } from "./controllers/auth/guest/refresh/AuthGuestRefreshController";
import { AuthMemberController } from "./controllers/auth/member/AuthMemberController";
import { AuthModeratorJoinController } from "./controllers/auth/moderator/join/AuthModeratorJoinController";
import { AuthModeratorLoginController } from "./controllers/auth/moderator/login/AuthModeratorLoginController";
import { AuthModeratorRefreshController } from "./controllers/auth/moderator/refresh/AuthModeratorRefreshController";
import { AuthAdminController } from "./controllers/auth/admin/AuthAdminController";
import { DiscussionboardAdminDiscussionboardmembersController } from "./controllers/discussionBoard/admin/discussionBoardMembers/DiscussionboardAdminDiscussionboardmembersController";
import { DiscussionboardMemberDiscussionboardmembersController } from "./controllers/discussionBoard/member/discussionBoardMembers/DiscussionboardMemberDiscussionboardmembersController";
import { DiscussionboardDiscussionboardpostsController } from "./controllers/discussionBoard/discussionBoardPosts/DiscussionboardDiscussionboardpostsController";
import { DiscussionboardMemberDiscussionboardpostsController } from "./controllers/discussionBoard/member/discussionBoardPosts/DiscussionboardMemberDiscussionboardpostsController";
import { DiscussionboardModeratorDiscussionboardpostsController } from "./controllers/discussionBoard/moderator/discussionBoardPosts/DiscussionboardModeratorDiscussionboardpostsController";
import { DiscussionboardMemberDiscussionboardpostsDiscussionboardrepliesController } from "./controllers/discussionBoard/member/discussionBoardPosts/discussionBoardReplies/DiscussionboardMemberDiscussionboardpostsDiscussionboardrepliesController";
import { DiscussionboardModeratorDiscussionboardpostsDiscussionboardrepliesController } from "./controllers/discussionBoard/moderator/discussionBoardPosts/discussionBoardReplies/DiscussionboardModeratorDiscussionboardpostsDiscussionboardrepliesController";
import { DiscussionboardAdminDiscussionboardpostsDiscussionboardrepliesController } from "./controllers/discussionBoard/admin/discussionBoardPosts/discussionBoardReplies/DiscussionboardAdminDiscussionboardpostsDiscussionboardrepliesController";
import { DiscussionboardAdminDiscussionboardmoderatorsController } from "./controllers/discussionBoard/admin/discussionBoardModerators/DiscussionboardAdminDiscussionboardmoderatorsController";
import { DiscussionboardAdminDiscussionboardadminsController } from "./controllers/discussionBoard/admin/discussionBoardAdmins/DiscussionboardAdminDiscussionboardadminsController";
import { DiscussionboardAdminDiscussionboardguestsController } from "./controllers/discussionBoard/admin/discussionBoardGuests/DiscussionboardAdminDiscussionboardguestsController";
import { DiscussionboardDiscussionboardcategoriesController } from "./controllers/discussionBoard/discussionBoardCategories/DiscussionboardDiscussionboardcategoriesController";
import { DiscussionboardAdminDiscussionboardcategoriesController } from "./controllers/discussionBoard/admin/discussionBoardCategories/DiscussionboardAdminDiscussionboardcategoriesController";
import { DiscussionboardModeratorDiscussionboardcategoriesController } from "./controllers/discussionBoard/moderator/discussionBoardCategories/DiscussionboardModeratorDiscussionboardcategoriesController";
import { DiscussionboardDiscussionboardpostsDiscussionboardrepliesController } from "./controllers/discussionBoard/discussionBoardPosts/discussionBoardReplies/DiscussionboardDiscussionboardpostsDiscussionboardrepliesController";
import { DiscussionboardModeratorDiscussionboardModerationlogsController } from "./controllers/discussionBoard/moderator/discussionBoard/moderationLogs/DiscussionboardModeratorDiscussionboardModerationlogsController";
import { DiscussionboardAdminDiscussionboardModerationlogsController } from "./controllers/discussionBoard/admin/discussionBoard/moderationLogs/DiscussionboardAdminDiscussionboardModerationlogsController";

@Module({
  controllers: [
    AuthGuestJoinController,
    AuthGuestRefreshController,
    AuthMemberController,
    AuthModeratorJoinController,
    AuthModeratorLoginController,
    AuthModeratorRefreshController,
    AuthAdminController,
    DiscussionboardAdminDiscussionboardmembersController,
    DiscussionboardMemberDiscussionboardmembersController,
    DiscussionboardDiscussionboardpostsController,
    DiscussionboardMemberDiscussionboardpostsController,
    DiscussionboardModeratorDiscussionboardpostsController,
    DiscussionboardMemberDiscussionboardpostsDiscussionboardrepliesController,
    DiscussionboardModeratorDiscussionboardpostsDiscussionboardrepliesController,
    DiscussionboardAdminDiscussionboardpostsDiscussionboardrepliesController,
    DiscussionboardAdminDiscussionboardmoderatorsController,
    DiscussionboardAdminDiscussionboardadminsController,
    DiscussionboardAdminDiscussionboardguestsController,
    DiscussionboardDiscussionboardcategoriesController,
    DiscussionboardAdminDiscussionboardcategoriesController,
    DiscussionboardModeratorDiscussionboardcategoriesController,
    DiscussionboardDiscussionboardpostsDiscussionboardrepliesController,
    DiscussionboardModeratorDiscussionboardModerationlogsController,
    DiscussionboardAdminDiscussionboardModerationlogsController,
  ],
})
export class MyModule {}
