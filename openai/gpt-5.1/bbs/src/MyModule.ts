import { Module } from "@nestjs/common";

import { AuthGuestuserController } from "./controllers/auth/guestUser/AuthGuestuserController";
import { AuthMemberuserController } from "./controllers/auth/memberUser/AuthMemberuserController";
import { AuthAdminuserController } from "./controllers/auth/adminUser/AuthAdminuserController";
import { DiscussionboardArticlesController } from "./controllers/discussionBoard/articles/DiscussionboardArticlesController";
import { DiscussionboardMemberuserArticlesController } from "./controllers/discussionBoard/memberUser/articles/DiscussionboardMemberuserArticlesController";
import { DiscussionboardAdminuserArticlesController } from "./controllers/discussionBoard/adminUser/articles/DiscussionboardAdminuserArticlesController";
import { DiscussionboardArticlecategoriesController } from "./controllers/discussionBoard/articleCategories/DiscussionboardArticlecategoriesController";
import { DiscussionboardAdminuserArticlecategoriesController } from "./controllers/discussionBoard/adminUser/articleCategories/DiscussionboardAdminuserArticlecategoriesController";
import { DiscussionboardArticlesMemberauthorController } from "./controllers/discussionBoard/articles/memberAuthor/DiscussionboardArticlesMemberauthorController";
import { DiscussionboardArticlesAdminauthorController } from "./controllers/discussionBoard/articles/adminAuthor/DiscussionboardArticlesAdminauthorController";
import { DiscussionboardMemberuserArticlesLikesController } from "./controllers/discussionBoard/memberUser/articles/likes/DiscussionboardMemberuserArticlesLikesController";
import { DiscussionboardMemberuserMembersLikedarticlesController } from "./controllers/discussionBoard/memberUser/members/likedArticles/DiscussionboardMemberuserMembersLikedarticlesController";
import { DiscussionboardArticlesCommentsController } from "./controllers/discussionBoard/articles/comments/DiscussionboardArticlesCommentsController";
import { DiscussionboardMemberuserArticlesCommentsController } from "./controllers/discussionBoard/memberUser/articles/comments/DiscussionboardMemberuserArticlesCommentsController";
import { DiscussionboardAdminuserArticlesCommentsController } from "./controllers/discussionBoard/adminUser/articles/comments/DiscussionboardAdminuserArticlesCommentsController";
import { DiscussionboardArticlesAttachmentsController } from "./controllers/discussionBoard/articles/attachments/DiscussionboardArticlesAttachmentsController";
import { DiscussionboardMemberuserArticlesAttachmentsController } from "./controllers/discussionBoard/memberUser/articles/attachments/DiscussionboardMemberuserArticlesAttachmentsController";
import { DiscussionboardAdminuserArticlesAttachmentsController } from "./controllers/discussionBoard/adminUser/articles/attachments/DiscussionboardAdminuserArticlesAttachmentsController";
import { DiscussionboardAdminuserArticlesAttachmentsReportlinksController } from "./controllers/discussionBoard/adminUser/articles/attachments/reportLinks/DiscussionboardAdminuserArticlesAttachmentsReportlinksController";
import { DiscussionboardAdminuserGuestusersController } from "./controllers/discussionBoard/adminUser/guestUsers/DiscussionboardAdminuserGuestusersController";
import { DiscussionboardAdminuserMemberusersController } from "./controllers/discussionBoard/adminUser/memberUsers/DiscussionboardAdminuserMemberusersController";
import { DiscussionboardAdminuserAdminusersController } from "./controllers/discussionBoard/adminUser/adminUsers/DiscussionboardAdminuserAdminusersController";
import { DiscussionboardAdminuserMemberusersSessionsController } from "./controllers/discussionBoard/adminUser/memberUsers/sessions/DiscussionboardAdminuserMemberusersSessionsController";
import { DiscussionboardAdminuserAdminusersSessionsController } from "./controllers/discussionBoard/adminUser/adminUsers/sessions/DiscussionboardAdminuserAdminusersSessionsController";
import { DiscussionboardMemberuserMemberusersRestrictionController } from "./controllers/discussionBoard/memberUser/memberUsers/restriction/DiscussionboardMemberuserMemberusersRestrictionController";
import { DiscussionboardAdminuserMemberusersRestrictionController } from "./controllers/discussionBoard/adminUser/memberUsers/restriction/DiscussionboardAdminuserMemberusersRestrictionController";
import { DiscussionboardAdminuserReportsController } from "./controllers/discussionBoard/adminUser/reports/DiscussionboardAdminuserReportsController";
import { DiscussionboardMemberuserReportsController } from "./controllers/discussionBoard/memberUser/reports/DiscussionboardMemberuserReportsController";
import { DiscussionboardAdminuserReportsArticleController } from "./controllers/discussionBoard/adminUser/reports/article/DiscussionboardAdminuserReportsArticleController";
import { DiscussionboardAdminuserReportsCommentController } from "./controllers/discussionBoard/adminUser/reports/comment/DiscussionboardAdminuserReportsCommentController";
import { DiscussionboardAdminuserReportsAttachmentController } from "./controllers/discussionBoard/adminUser/reports/attachment/DiscussionboardAdminuserReportsAttachmentController";
import { DiscussionboardAdminuserReportsReporterMemberuserController } from "./controllers/discussionBoard/adminUser/reports/reporter/memberUser/DiscussionboardAdminuserReportsReporterMemberuserController";
import { DiscussionboardAdminuserReportsReporterAdminuserController } from "./controllers/discussionBoard/adminUser/reports/reporter/adminUser/DiscussionboardAdminuserReportsReporterAdminuserController";
import { DiscussionboardAdminuserReportsStatisticsBytargetController } from "./controllers/discussionBoard/adminUser/reports/statistics/byTarget/DiscussionboardAdminuserReportsStatisticsBytargetController";
import { DiscussionboardAdminuserReportsStatisticsByreasonController } from "./controllers/discussionBoard/adminUser/reports/statistics/byReason/DiscussionboardAdminuserReportsStatisticsByreasonController";
import { DiscussionboardAdminuserReportsStatisticsBystatusController } from "./controllers/discussionBoard/adminUser/reports/statistics/byStatus/DiscussionboardAdminuserReportsStatisticsBystatusController";
import { DiscussionboardMemberuserNotificationsMemberuserPreferencesController } from "./controllers/discussionBoard/memberUser/notifications/memberUser/preferences/DiscussionboardMemberuserNotificationsMemberuserPreferencesController";
import { DiscussionboardAdminuserNotificationsAdminuserPreferencesController } from "./controllers/discussionBoard/adminUser/notifications/adminUser/preferences/DiscussionboardAdminuserNotificationsAdminuserPreferencesController";

@Module({
  controllers: [
    AuthGuestuserController,
    AuthMemberuserController,
    AuthAdminuserController,
    DiscussionboardArticlesController,
    DiscussionboardMemberuserArticlesController,
    DiscussionboardAdminuserArticlesController,
    DiscussionboardArticlecategoriesController,
    DiscussionboardAdminuserArticlecategoriesController,
    DiscussionboardArticlesMemberauthorController,
    DiscussionboardArticlesAdminauthorController,
    DiscussionboardMemberuserArticlesLikesController,
    DiscussionboardMemberuserMembersLikedarticlesController,
    DiscussionboardArticlesCommentsController,
    DiscussionboardMemberuserArticlesCommentsController,
    DiscussionboardAdminuserArticlesCommentsController,
    DiscussionboardArticlesAttachmentsController,
    DiscussionboardMemberuserArticlesAttachmentsController,
    DiscussionboardAdminuserArticlesAttachmentsController,
    DiscussionboardAdminuserArticlesAttachmentsReportlinksController,
    DiscussionboardAdminuserGuestusersController,
    DiscussionboardAdminuserMemberusersController,
    DiscussionboardAdminuserAdminusersController,
    DiscussionboardAdminuserMemberusersSessionsController,
    DiscussionboardAdminuserAdminusersSessionsController,
    DiscussionboardMemberuserMemberusersRestrictionController,
    DiscussionboardAdminuserMemberusersRestrictionController,
    DiscussionboardAdminuserReportsController,
    DiscussionboardMemberuserReportsController,
    DiscussionboardAdminuserReportsArticleController,
    DiscussionboardAdminuserReportsCommentController,
    DiscussionboardAdminuserReportsAttachmentController,
    DiscussionboardAdminuserReportsReporterMemberuserController,
    DiscussionboardAdminuserReportsReporterAdminuserController,
    DiscussionboardAdminuserReportsStatisticsBytargetController,
    DiscussionboardAdminuserReportsStatisticsByreasonController,
    DiscussionboardAdminuserReportsStatisticsBystatusController,
    DiscussionboardMemberuserNotificationsMemberuserPreferencesController,
    DiscussionboardAdminuserNotificationsAdminuserPreferencesController,
  ],
})
export class MyModule {}
