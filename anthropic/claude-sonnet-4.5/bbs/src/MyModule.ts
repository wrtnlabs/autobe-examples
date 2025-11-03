import { Module } from "@nestjs/common";

import { AuthGuestController } from "./controllers/auth/guest/AuthGuestController";
import { AuthMemberController } from "./controllers/auth/member/AuthMemberController";
import { AuthModeratorController } from "./controllers/auth/moderator/AuthModeratorController";
import { DiscussionboardCategoriesController } from "./controllers/discussionBoard/categories/DiscussionboardCategoriesController";
import { DiscussionboardModeratorCategoriesController } from "./controllers/discussionBoard/moderator/categories/DiscussionboardModeratorCategoriesController";
import { DiscussionboardCategoriesArticlesController } from "./controllers/discussionBoard/categories/articles/DiscussionboardCategoriesArticlesController";
import { DiscussionboardTagsController } from "./controllers/discussionBoard/tags/DiscussionboardTagsController";
import { DiscussionboardModeratorTagsController } from "./controllers/discussionBoard/moderator/tags/DiscussionboardModeratorTagsController";
import { DiscussionboardTagsArticlesController } from "./controllers/discussionBoard/tags/articles/DiscussionboardTagsArticlesController";
import { DiscussionboardMembersController } from "./controllers/discussionBoard/members/DiscussionboardMembersController";
import { DiscussionboardMemberMembersController } from "./controllers/discussionBoard/member/members/DiscussionboardMemberMembersController";
import { DiscussionboardMemberMembersPasswordController } from "./controllers/discussionBoard/member/members/password/DiscussionboardMemberMembersPasswordController";
import { DiscussionboardMembersArticlesController } from "./controllers/discussionBoard/members/articles/DiscussionboardMembersArticlesController";
import { DiscussionboardMembersCommentsController } from "./controllers/discussionBoard/members/comments/DiscussionboardMembersCommentsController";
import { DiscussionboardModeratorModeratorsController } from "./controllers/discussionBoard/moderator/moderators/DiscussionboardModeratorModeratorsController";
import { DiscussionboardModeratorModeratorsPasswordController } from "./controllers/discussionBoard/moderator/moderators/password/DiscussionboardModeratorModeratorsPasswordController";
import { DiscussionboardAuthController } from "./controllers/discussionBoard/auth/DiscussionboardAuthController";
import { DiscussionboardMemberAuthController } from "./controllers/discussionBoard/member/auth/logout/DiscussionboardMemberAuthController";
import { DiscussionboardModeratorAuthController } from "./controllers/discussionBoard/moderator/auth/logout/DiscussionboardModeratorAuthController";
import { DiscussionboardAuthVerify_emailController } from "./controllers/discussionBoard/auth/verify-email/DiscussionboardAuthVerify_emailController";
import { DiscussionboardAuthPassword_resetController } from "./controllers/discussionBoard/auth/password-reset/DiscussionboardAuthPassword_resetController";
import { DiscussionboardArticlesController } from "./controllers/discussionBoard/articles/DiscussionboardArticlesController";
import { DiscussionboardMemberArticlesController } from "./controllers/discussionBoard/member/articles/DiscussionboardMemberArticlesController";
import { DiscussionboardModeratorArticlesController } from "./controllers/discussionBoard/moderator/articles/DiscussionboardModeratorArticlesController";
import { DiscussionboardMemberArticlesImagesController } from "./controllers/discussionBoard/member/articles/images/DiscussionboardMemberArticlesImagesController";
import { DiscussionboardModeratorArticlesImagesController } from "./controllers/discussionBoard/moderator/articles/images/DiscussionboardModeratorArticlesImagesController";
import { DiscussionboardArticlesImagesController } from "./controllers/discussionBoard/articles/images/DiscussionboardArticlesImagesController";
import { DiscussionboardMemberArticlesDocumentsController } from "./controllers/discussionBoard/member/articles/documents/DiscussionboardMemberArticlesDocumentsController";
import { DiscussionboardModeratorArticlesDocumentsController } from "./controllers/discussionBoard/moderator/articles/documents/DiscussionboardModeratorArticlesDocumentsController";
import { DiscussionboardArticlesDocumentsController } from "./controllers/discussionBoard/articles/documents/DiscussionboardArticlesDocumentsController";
import { DiscussionboardArticlesCommentsController } from "./controllers/discussionBoard/articles/comments/DiscussionboardArticlesCommentsController";
import { DiscussionboardMemberArticlesCommentsController } from "./controllers/discussionBoard/member/articles/comments/DiscussionboardMemberArticlesCommentsController";
import { DiscussionboardModeratorArticlesCommentsController } from "./controllers/discussionBoard/moderator/articles/comments/DiscussionboardModeratorArticlesCommentsController";
import { DiscussionboardArticlesCommentsRepliesController } from "./controllers/discussionBoard/articles/comments/replies/DiscussionboardArticlesCommentsRepliesController";
import { DiscussionboardMemberArticlesCommentsRepliesController } from "./controllers/discussionBoard/member/articles/comments/replies/DiscussionboardMemberArticlesCommentsRepliesController";
import { DiscussionboardModeratorArticlesCommentsRepliesController } from "./controllers/discussionBoard/moderator/articles/comments/replies/DiscussionboardModeratorArticlesCommentsRepliesController";
import { DiscussionboardSearchArticlesController } from "./controllers/discussionBoard/search/articles/DiscussionboardSearchArticlesController";
import { DiscussionboardModeratorReportsController } from "./controllers/discussionBoard/moderator/reports/DiscussionboardModeratorReportsController";
import { DiscussionboardMemberReportsController } from "./controllers/discussionBoard/member/reports/DiscussionboardMemberReportsController";
import { DiscussionboardReportsController } from "./controllers/discussionBoard/reports/DiscussionboardReportsController";
import { DiscussionboardModeratorModerationActionsController } from "./controllers/discussionBoard/moderator/moderation/actions/DiscussionboardModeratorModerationActionsController";
import { DiscussionboardModeratorModerationWarningsController } from "./controllers/discussionBoard/moderator/moderation/warnings/DiscussionboardModeratorModerationWarningsController";
import { DiscussionboardMemberModerationWarningsController } from "./controllers/discussionBoard/member/moderation/warnings/DiscussionboardMemberModerationWarningsController";
import { DiscussionboardModerationWarningsController } from "./controllers/discussionBoard/moderation/warnings/DiscussionboardModerationWarningsController";
import { DiscussionboardModeratorModerationSuspensionsController } from "./controllers/discussionBoard/moderator/moderation/suspensions/DiscussionboardModeratorModerationSuspensionsController";
import { DiscussionboardModeratorModerationDashboardController } from "./controllers/discussionBoard/moderator/moderation/dashboard/DiscussionboardModeratorModerationDashboardController";

@Module({
  controllers: [
    AuthGuestController,
    AuthMemberController,
    AuthModeratorController,
    DiscussionboardCategoriesController,
    DiscussionboardModeratorCategoriesController,
    DiscussionboardCategoriesArticlesController,
    DiscussionboardTagsController,
    DiscussionboardModeratorTagsController,
    DiscussionboardTagsArticlesController,
    DiscussionboardMembersController,
    DiscussionboardMemberMembersController,
    DiscussionboardMemberMembersPasswordController,
    DiscussionboardMembersArticlesController,
    DiscussionboardMembersCommentsController,
    DiscussionboardModeratorModeratorsController,
    DiscussionboardModeratorModeratorsPasswordController,
    DiscussionboardAuthController,
    DiscussionboardMemberAuthController,
    DiscussionboardModeratorAuthController,
    DiscussionboardAuthVerify_emailController,
    DiscussionboardAuthPassword_resetController,
    DiscussionboardArticlesController,
    DiscussionboardMemberArticlesController,
    DiscussionboardModeratorArticlesController,
    DiscussionboardMemberArticlesImagesController,
    DiscussionboardModeratorArticlesImagesController,
    DiscussionboardArticlesImagesController,
    DiscussionboardMemberArticlesDocumentsController,
    DiscussionboardModeratorArticlesDocumentsController,
    DiscussionboardArticlesDocumentsController,
    DiscussionboardArticlesCommentsController,
    DiscussionboardMemberArticlesCommentsController,
    DiscussionboardModeratorArticlesCommentsController,
    DiscussionboardArticlesCommentsRepliesController,
    DiscussionboardMemberArticlesCommentsRepliesController,
    DiscussionboardModeratorArticlesCommentsRepliesController,
    DiscussionboardSearchArticlesController,
    DiscussionboardModeratorReportsController,
    DiscussionboardMemberReportsController,
    DiscussionboardReportsController,
    DiscussionboardModeratorModerationActionsController,
    DiscussionboardModeratorModerationWarningsController,
    DiscussionboardMemberModerationWarningsController,
    DiscussionboardModerationWarningsController,
    DiscussionboardModeratorModerationSuspensionsController,
    DiscussionboardModeratorModerationDashboardController,
  ],
})
export class MyModule {}
