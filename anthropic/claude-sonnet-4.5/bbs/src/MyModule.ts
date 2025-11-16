import { Module } from "@nestjs/common";

import { AuthGuestController } from "./controllers/auth/guest/AuthGuestController";
import { AuthMemberController } from "./controllers/auth/member/AuthMemberController";
import { AuthModeratorController } from "./controllers/auth/moderator/AuthModeratorController";
import { DiscussionboardModeratorMembersController } from "./controllers/discussionBoard/moderator/members/DiscussionboardModeratorMembersController";
import { DiscussionboardMemberMembersController } from "./controllers/discussionBoard/member/members/DiscussionboardMemberMembersController";
import { DiscussionboardMemberMembersSessionsController } from "./controllers/discussionBoard/member/members/sessions/DiscussionboardMemberMembersSessionsController";
import { DiscussionboardModeratorMembersSessionsController } from "./controllers/discussionBoard/moderator/members/sessions/DiscussionboardModeratorMembersSessionsController";
import { DiscussionboardModeratorModeratorsController } from "./controllers/discussionBoard/moderator/moderators/DiscussionboardModeratorModeratorsController";
import { DiscussionboardModeratorModeratorsSessionsController } from "./controllers/discussionBoard/moderator/moderators/sessions/DiscussionboardModeratorModeratorsSessionsController";
import { DiscussionboardArticlesController } from "./controllers/discussionBoard/articles/DiscussionboardArticlesController";
import { DiscussionboardMemberArticlesController } from "./controllers/discussionBoard/member/articles/DiscussionboardMemberArticlesController";
import { DiscussionboardModeratorArticlesController } from "./controllers/discussionBoard/moderator/articles/DiscussionboardModeratorArticlesController";
import { DiscussionboardMemberArticlesImagesController } from "./controllers/discussionBoard/member/articles/images/DiscussionboardMemberArticlesImagesController";
import { DiscussionboardModeratorArticlesImagesController } from "./controllers/discussionBoard/moderator/articles/images/DiscussionboardModeratorArticlesImagesController";
import { DiscussionboardMemberArticlesFilesController } from "./controllers/discussionBoard/member/articles/files/DiscussionboardMemberArticlesFilesController";
import { DiscussionboardModeratorArticlesFilesController } from "./controllers/discussionBoard/moderator/articles/files/DiscussionboardModeratorArticlesFilesController";
import { DiscussionboardArticlesCommentsController } from "./controllers/discussionBoard/articles/comments/DiscussionboardArticlesCommentsController";
import { DiscussionboardMemberArticlesCommentsController } from "./controllers/discussionBoard/member/articles/comments/DiscussionboardMemberArticlesCommentsController";
import { DiscussionboardModeratorArticlesCommentsController } from "./controllers/discussionBoard/moderator/articles/comments/DiscussionboardModeratorArticlesCommentsController";
import { DiscussionboardArticlesImagesController } from "./controllers/discussionBoard/articles/images/DiscussionboardArticlesImagesController";
import { DiscussionboardArticlesFilesController } from "./controllers/discussionBoard/articles/files/DiscussionboardArticlesFilesController";

@Module({
  controllers: [
    AuthGuestController,
    AuthMemberController,
    AuthModeratorController,
    DiscussionboardModeratorMembersController,
    DiscussionboardMemberMembersController,
    DiscussionboardMemberMembersSessionsController,
    DiscussionboardModeratorMembersSessionsController,
    DiscussionboardModeratorModeratorsController,
    DiscussionboardModeratorModeratorsSessionsController,
    DiscussionboardArticlesController,
    DiscussionboardMemberArticlesController,
    DiscussionboardModeratorArticlesController,
    DiscussionboardMemberArticlesImagesController,
    DiscussionboardModeratorArticlesImagesController,
    DiscussionboardMemberArticlesFilesController,
    DiscussionboardModeratorArticlesFilesController,
    DiscussionboardArticlesCommentsController,
    DiscussionboardMemberArticlesCommentsController,
    DiscussionboardModeratorArticlesCommentsController,
    DiscussionboardArticlesImagesController,
    DiscussionboardArticlesFilesController,
  ],
})
export class MyModule {}
