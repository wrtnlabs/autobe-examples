import { Module } from "@nestjs/common";

import { AuthCitizenController } from "./controllers/auth/citizen/AuthCitizenController";
import { AuthModeratorController } from "./controllers/auth/moderator/AuthModeratorController";
import { PoliticalforumPostsController } from "./controllers/politicalForum/posts/PoliticalforumPostsController";
import { PoliticalforumCitizenPostsController } from "./controllers/politicalForum/citizen/posts/PoliticalforumCitizenPostsController";
import { PoliticalforumModeratorPostsController } from "./controllers/politicalForum/moderator/posts/PoliticalforumModeratorPostsController";
import { PoliticalforumPostsCommentsController } from "./controllers/politicalForum/posts/comments/PoliticalforumPostsCommentsController";
import { PoliticalforumCitizenPostsCommentsController } from "./controllers/politicalForum/citizen/posts/comments/PoliticalforumCitizenPostsCommentsController";
import { PoliticalforumModeratorPostsCommentsController } from "./controllers/politicalForum/moderator/posts/comments/PoliticalforumModeratorPostsCommentsController";
import { PoliticalforumCitizenPostsReportsController } from "./controllers/politicalForum/citizen/posts/reports/PoliticalforumCitizenPostsReportsController";
import { PoliticalforumCitizenCommentsReportsController } from "./controllers/politicalForum/citizen/comments/reports/PoliticalforumCitizenCommentsReportsController";
import { PoliticalforumCitizenPostsAttachmentfilesController } from "./controllers/politicalForum/citizen/posts/attachmentFiles/PoliticalforumCitizenPostsAttachmentfilesController";
import { PoliticalforumPostsAttachmentfilesController } from "./controllers/politicalForum/posts/attachmentFiles/PoliticalforumPostsAttachmentfilesController";
import { PoliticalforumCitizenReportsController } from "./controllers/politicalForum/citizen/reports/PoliticalforumCitizenReportsController";
import { PoliticalforumModeratorReportsController } from "./controllers/politicalForum/moderator/reports/PoliticalforumModeratorReportsController";
import { PoliticalforumReportsPostController } from "./controllers/politicalForum/reports/post/PoliticalforumReportsPostController";
import { PoliticalforumReportsCommentController } from "./controllers/politicalForum/reports/comment/PoliticalforumReportsCommentController";
import { PoliticalforumCommentsController } from "./controllers/politicalForum/comments/PoliticalforumCommentsController";
import { PoliticalforumModeratorUsersController } from "./controllers/politicalForum/moderator/users/PoliticalforumModeratorUsersController";
import { PoliticalforumCitizenUsersController } from "./controllers/politicalForum/citizen/users/PoliticalforumCitizenUsersController";
import { PoliticalforumModeratorDashboardsPlatform_activityController } from "./controllers/politicalForum/moderator/dashboards/platform-activity/PoliticalforumModeratorDashboardsPlatform_activityController";
import { PoliticalforumModeratorDashboardsModeration_efficiencyController } from "./controllers/politicalForum/moderator/dashboards/moderation-efficiency/PoliticalforumModeratorDashboardsModeration_efficiencyController";
import { PoliticalforumModeratorReportsWeekly_activityController } from "./controllers/politicalForum/moderator/reports/weekly-activity/PoliticalforumModeratorReportsWeekly_activityController";
import { PoliticalforumModeratorReportsUser_engagementController } from "./controllers/politicalForum/moderator/reports/user-engagement/PoliticalforumModeratorReportsUser_engagementController";

@Module({
  controllers: [
    AuthCitizenController,
    AuthModeratorController,
    PoliticalforumPostsController,
    PoliticalforumCitizenPostsController,
    PoliticalforumModeratorPostsController,
    PoliticalforumPostsCommentsController,
    PoliticalforumCitizenPostsCommentsController,
    PoliticalforumModeratorPostsCommentsController,
    PoliticalforumCitizenPostsReportsController,
    PoliticalforumCitizenCommentsReportsController,
    PoliticalforumCitizenPostsAttachmentfilesController,
    PoliticalforumPostsAttachmentfilesController,
    PoliticalforumCitizenReportsController,
    PoliticalforumModeratorReportsController,
    PoliticalforumReportsPostController,
    PoliticalforumReportsCommentController,
    PoliticalforumCommentsController,
    PoliticalforumModeratorUsersController,
    PoliticalforumCitizenUsersController,
    PoliticalforumModeratorDashboardsPlatform_activityController,
    PoliticalforumModeratorDashboardsModeration_efficiencyController,
    PoliticalforumModeratorReportsWeekly_activityController,
    PoliticalforumModeratorReportsUser_engagementController,
  ],
})
export class MyModule {}
