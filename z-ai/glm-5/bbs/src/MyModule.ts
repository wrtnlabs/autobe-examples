import { Module } from "@nestjs/common";

import { DiscussionboardArticlesController } from "./controllers/discussionBoard/articles/DiscussionboardArticlesController";
import { DiscussionboardArticlesCommentsController } from "./controllers/discussionBoard/articles/comments/DiscussionboardArticlesCommentsController";
import { DiscussionboardArticlesFilesController } from "./controllers/discussionBoard/articles/files/DiscussionboardArticlesFilesController";
import { DiscussionboardArticlesImagesController } from "./controllers/discussionBoard/articles/images/DiscussionboardArticlesImagesController";
import { DiscussionboardArticlesTagsController } from "./controllers/discussionBoard/articles/tags/DiscussionboardArticlesTagsController";
import { DiscussionboardAuthUserController } from "./controllers/discussionBoard/auth/user/DiscussionboardAuthUserController";
import { DiscussionboardBan_historiesController } from "./controllers/discussionBoard/ban-histories/DiscussionboardBan_historiesController";
import { DiscussionboardBansController } from "./controllers/discussionBoard/bans/DiscussionboardBansController";
import { DiscussionboardSectionsController } from "./controllers/discussionBoard/sections/DiscussionboardSectionsController";
import { DiscussionboardTagsController } from "./controllers/discussionBoard/tags/DiscussionboardTagsController";
import { DiscussionboardUnbansController } from "./controllers/discussionBoard/unbans/DiscussionboardUnbansController";
import { DiscussionboardUserAdminactionlogsController } from "./controllers/discussionBoard/user/adminActionLogs/DiscussionboardUserAdminactionlogsController";
import { DiscussionboardUserAdminhierarchyactionsController } from "./controllers/discussionBoard/user/adminHierarchyActions/DiscussionboardUserAdminhierarchyactionsController";
import { DiscussionboardUserAdminrequestsController } from "./controllers/discussionBoard/user/adminRequests/DiscussionboardUserAdminrequestsController";
import { DiscussionboardUserAdministratorsController } from "./controllers/discussionBoard/user/administrators/DiscussionboardUserAdministratorsController";
import { DiscussionboardUserArticlesController } from "./controllers/discussionBoard/user/articles/DiscussionboardUserArticlesController";
import { DiscussionboardUserArticlesCommentsController } from "./controllers/discussionBoard/user/articles/comments/DiscussionboardUserArticlesCommentsController";
import { DiscussionboardUserArticlesFilesController } from "./controllers/discussionBoard/user/articles/files/DiscussionboardUserArticlesFilesController";
import { DiscussionboardUserArticlesImagesController } from "./controllers/discussionBoard/user/articles/images/DiscussionboardUserArticlesImagesController";
import { DiscussionboardUserArticlesTagsController } from "./controllers/discussionBoard/user/articles/tags/DiscussionboardUserArticlesTagsController";
import { DiscussionboardUserAudit_logsController } from "./controllers/discussionBoard/user/audit-logs/DiscussionboardUserAudit_logsController";
import { DiscussionboardUserProfileController } from "./controllers/discussionBoard/user/profile/DiscussionboardUserProfileController";
import { DiscussionboardUserSectionsController } from "./controllers/discussionBoard/user/sections/DiscussionboardUserSectionsController";
import { DiscussionboardUserSessionsController } from "./controllers/discussionBoard/user/sessions/DiscussionboardUserSessionsController";
import { DiscussionboardUserUsersBan_historiesController } from "./controllers/discussionBoard/user/users/ban-histories/DiscussionboardUserUsersBan_historiesController";
import { DiscussionboardUserUsersBan_statusController } from "./controllers/discussionBoard/user/users/ban-status/DiscussionboardUserUsersBan_statusController";
import { DiscussionboardUsersController } from "./controllers/discussionBoard/users/DiscussionboardUsersController";

@Module({
  controllers: [
    DiscussionboardAuthUserController,
    DiscussionboardUsersController,
    DiscussionboardUserProfileController,
    DiscussionboardUserSessionsController,
    DiscussionboardUserAudit_logsController,
    DiscussionboardSectionsController,
    DiscussionboardUserSectionsController,
    DiscussionboardUserArticlesController,
    DiscussionboardArticlesController,
    DiscussionboardArticlesFilesController,
    DiscussionboardUserArticlesFilesController,
    DiscussionboardArticlesImagesController,
    DiscussionboardUserArticlesImagesController,
    DiscussionboardTagsController,
    DiscussionboardArticlesTagsController,
    DiscussionboardUserArticlesTagsController,
    DiscussionboardUserArticlesCommentsController,
    DiscussionboardArticlesCommentsController,
    DiscussionboardUserAdminrequestsController,
    DiscussionboardUserAdminhierarchyactionsController,
    DiscussionboardUserAdminactionlogsController,
    DiscussionboardBansController,
    DiscussionboardUnbansController,
    DiscussionboardBan_historiesController,
    DiscussionboardUserAdministratorsController,
    DiscussionboardUserUsersBan_statusController,
    DiscussionboardUserUsersBan_historiesController,
  ],
})
export class MyModule {}
