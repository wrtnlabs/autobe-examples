import { Module } from "@nestjs/common";

import { AuthGuestController } from "./controllers/auth/guest/AuthGuestController";
import { AuthContributorController } from "./controllers/auth/contributor/AuthContributorController";
import { AuthModeratorController } from "./controllers/auth/moderator/AuthModeratorController";
import { DiscussionboardAuthRequest_password_resetController } from "./controllers/discussionBoard/auth/request-password-reset/DiscussionboardAuthRequest_password_resetController";
import { DiscussionboardAuthReset_passwordController } from "./controllers/discussionBoard/auth/reset-password/DiscussionboardAuthReset_passwordController";
import { DiscussionboardContributorProfileController } from "./controllers/discussionBoard/contributor/profile/DiscussionboardContributorProfileController";
import { DiscussionboardModeratorProfileController } from "./controllers/discussionBoard/moderator/profile/DiscussionboardModeratorProfileController";
import { MyProfileController } from "./controllers/my/profile/MyProfileController";
import { DiscussionboardContributorProfileChange_passwordController } from "./controllers/discussionBoard/contributor/profile/change-password/DiscussionboardContributorProfileChange_passwordController";
import { DiscussionboardContributorProfile_deleteController } from "./controllers/discussionBoard/contributor/profile/delete/DiscussionboardContributorProfile_deleteController";
import { DiscussionboardContributorsController } from "./controllers/discussionBoard/contributors/DiscussionboardContributorsController";
import { DiscussionboardArticlesController } from "./controllers/discussionBoard/articles/DiscussionboardArticlesController";
import { DiscussionboardContributorArticlesController } from "./controllers/discussionBoard/contributor/articles/DiscussionboardContributorArticlesController";
import { DiscussionboardModeratorArticlesController } from "./controllers/discussionBoard/moderator/articles/DiscussionboardModeratorArticlesController";
import { DiscussionboardContributorArticlesAttachmentsController } from "./controllers/discussionBoard/contributor/articles/attachments/DiscussionboardContributorArticlesAttachmentsController";
import { DiscussionboardModeratorArticlesAttachmentsController } from "./controllers/discussionBoard/moderator/articles/attachments/DiscussionboardModeratorArticlesAttachmentsController";
import { DiscussionboardArticlesCommentsController } from "./controllers/discussionBoard/articles/comments/DiscussionboardArticlesCommentsController";
import { DiscussionboardContributorArticlesCommentsController } from "./controllers/discussionBoard/contributor/articles/comments/DiscussionboardContributorArticlesCommentsController";
import { DiscussionboardContributorArticlesCommentsAttachmentsController } from "./controllers/discussionBoard/contributor/articles/comments/attachments/DiscussionboardContributorArticlesCommentsAttachmentsController";
import { DiscussionboardModeratorArticlesCommentsAttachmentsController } from "./controllers/discussionBoard/moderator/articles/comments/attachments/DiscussionboardModeratorArticlesCommentsAttachmentsController";
import { DiscussionboardArticlesCommentsAttachmentsController } from "./controllers/discussionBoard/articles/comments/attachments/DiscussionboardArticlesCommentsAttachmentsController";
import { DiscussionboardCategoriesController } from "./controllers/discussionBoard/categories/DiscussionboardCategoriesController";
import { DiscussionboardGuidelinesController } from "./controllers/discussionBoard/guidelines/DiscussionboardGuidelinesController";
import { DiscussionboardModeratorModerationQueueController } from "./controllers/discussionBoard/moderator/moderation/queue/DiscussionboardModeratorModerationQueueController";
import { DiscussionboardModeratorModerationViolationsController } from "./controllers/discussionBoard/moderator/moderation/violations/DiscussionboardModeratorModerationViolationsController";
import { DiscussionboardModeratorModerationAudit_logController } from "./controllers/discussionBoard/moderator/moderation/audit-log/DiscussionboardModeratorModerationAudit_logController";
import { DiscussionboardModeratorModerationSuspensionsController } from "./controllers/discussionBoard/moderator/moderation/suspensions/DiscussionboardModeratorModerationSuspensionsController";
import { DiscussionboardModeratorModerationRestrictionsController } from "./controllers/discussionBoard/moderator/moderation/restrictions/DiscussionboardModeratorModerationRestrictionsController";
import { DiscussionboardModeratorContributorsSuspendController } from "./controllers/discussionBoard/moderator/contributors/suspend/DiscussionboardModeratorContributorsSuspendController";
import { DiscussionboardModeratorContributorsController } from "./controllers/discussionBoard/moderator/contributors/restrict/DiscussionboardModeratorContributorsController";
import { DiscussionboardModeratorContributorsLift_restrictionController } from "./controllers/discussionBoard/moderator/contributors/lift-restriction/DiscussionboardModeratorContributorsLift_restrictionController";

@Module({
  controllers: [
    AuthGuestController,
    AuthContributorController,
    AuthModeratorController,
    DiscussionboardAuthRequest_password_resetController,
    DiscussionboardAuthReset_passwordController,
    DiscussionboardContributorProfileController,
    DiscussionboardModeratorProfileController,
    MyProfileController,
    DiscussionboardContributorProfileChange_passwordController,
    DiscussionboardContributorProfile_deleteController,
    DiscussionboardContributorsController,
    DiscussionboardArticlesController,
    DiscussionboardContributorArticlesController,
    DiscussionboardModeratorArticlesController,
    DiscussionboardContributorArticlesAttachmentsController,
    DiscussionboardModeratorArticlesAttachmentsController,
    DiscussionboardArticlesCommentsController,
    DiscussionboardContributorArticlesCommentsController,
    DiscussionboardContributorArticlesCommentsAttachmentsController,
    DiscussionboardModeratorArticlesCommentsAttachmentsController,
    DiscussionboardArticlesCommentsAttachmentsController,
    DiscussionboardCategoriesController,
    DiscussionboardGuidelinesController,
    DiscussionboardModeratorModerationQueueController,
    DiscussionboardModeratorModerationViolationsController,
    DiscussionboardModeratorModerationAudit_logController,
    DiscussionboardModeratorModerationSuspensionsController,
    DiscussionboardModeratorModerationRestrictionsController,
    DiscussionboardModeratorContributorsSuspendController,
    DiscussionboardModeratorContributorsController,
    DiscussionboardModeratorContributorsLift_restrictionController,
  ],
})
export class MyModule {}
