import { Module } from "@nestjs/common";

import { AuthGuestController } from "./controllers/auth/guest/AuthGuestController";
import { AuthMemberController } from "./controllers/auth/member/AuthMemberController";
import { AuthModeratorController } from "./controllers/auth/moderator/AuthModeratorController";
import { EconomicdiscussionModeratorSystem_settingsController } from "./controllers/economicDiscussion/moderator/system-settings/EconomicdiscussionModeratorSystem_settingsController";
import { EconomicdiscussionModeratorGuestsController } from "./controllers/economicDiscussion/moderator/guests/EconomicdiscussionModeratorGuestsController";
import { EconomicdiscussionGuestsSessionsController } from "./controllers/economicDiscussion/guests/sessions/EconomicdiscussionGuestsSessionsController";
import { EconomicdiscussionModeratorGuestsSessionsController } from "./controllers/economicDiscussion/moderator/guests/sessions/EconomicdiscussionModeratorGuestsSessionsController";
import { EconomicdiscussionModeratorMembersController } from "./controllers/economicDiscussion/moderator/members/EconomicdiscussionModeratorMembersController";
import { EconomicdiscussionMemberMembersController } from "./controllers/economicDiscussion/member/members/EconomicdiscussionMemberMembersController";
import { EconomicdiscussionMemberMembersSessionsController } from "./controllers/economicDiscussion/member/members/sessions/EconomicdiscussionMemberMembersSessionsController";
import { EconomicdiscussionModeratorModeratorsController } from "./controllers/economicDiscussion/moderator/moderators/EconomicdiscussionModeratorModeratorsController";
import { EconomicdiscussionModeratorModeratorsSessionsController } from "./controllers/economicDiscussion/moderator/moderators/sessions/EconomicdiscussionModeratorModeratorsSessionsController";
import { EconomicdiscussionArticlesController } from "./controllers/economicDiscussion/articles/EconomicdiscussionArticlesController";
import { EconomicdiscussionMemberArticlesController } from "./controllers/economicDiscussion/member/articles/EconomicdiscussionMemberArticlesController";
import { EconomicdiscussionModeratorArticlesController } from "./controllers/economicDiscussion/moderator/articles/EconomicdiscussionModeratorArticlesController";
import { EconomicdiscussionMemberArticlesVersionsController } from "./controllers/economicDiscussion/member/articles/versions/EconomicdiscussionMemberArticlesVersionsController";
import { EconomicdiscussionCategoriesController } from "./controllers/economicDiscussion/categories/EconomicdiscussionCategoriesController";
import { EconomicdiscussionModeratorCategoriesController } from "./controllers/economicDiscussion/moderator/categories/EconomicdiscussionModeratorCategoriesController";
import { EconomicdiscussionMemberArticlesCategoriesController } from "./controllers/economicDiscussion/member/articles/categories/EconomicdiscussionMemberArticlesCategoriesController";
import { EconomicdiscussionModeratorArticlesCategoriesController } from "./controllers/economicDiscussion/moderator/articles/categories/EconomicdiscussionModeratorArticlesCategoriesController";
import { EconomicdiscussionMemberArticlesAttachmentfilesController } from "./controllers/economicDiscussion/member/articles/attachmentFiles/EconomicdiscussionMemberArticlesAttachmentfilesController";
import { EconomicdiscussionArticlesCommentsController } from "./controllers/economicDiscussion/articles/comments/EconomicdiscussionArticlesCommentsController";
import { EconomicdiscussionMemberArticlesCommentsController } from "./controllers/economicDiscussion/member/articles/comments/EconomicdiscussionMemberArticlesCommentsController";
import { EconomicdiscussionModeratorArticlesCommentsController } from "./controllers/economicDiscussion/moderator/articles/comments/EconomicdiscussionModeratorArticlesCommentsController";
import { EconomicdiscussionArticlesAttachmentsController } from "./controllers/economicDiscussion/articles/attachments/EconomicdiscussionArticlesAttachmentsController";
import { EconomicdiscussionMemberArticlesAttachmentsController } from "./controllers/economicDiscussion/member/articles/attachments/EconomicdiscussionMemberArticlesAttachmentsController";
import { EconomicdiscussionModeratorArticlesAttachmentsController } from "./controllers/economicDiscussion/moderator/articles/attachments/EconomicdiscussionModeratorArticlesAttachmentsController";
import { EconomicdiscussionGuestSearchGlobalController } from "./controllers/economicDiscussion/guest/search/global/EconomicdiscussionGuestSearchGlobalController";
import { EconomicdiscussionMemberSearchGlobalController } from "./controllers/economicDiscussion/member/search/global/EconomicdiscussionMemberSearchGlobalController";
import { EconomicdiscussionModeratorSearchGlobalController } from "./controllers/economicDiscussion/moderator/search/global/EconomicdiscussionModeratorSearchGlobalController";
import { EconomicdiscussionSearchArticlesController } from "./controllers/economicDiscussion/search/articles/EconomicdiscussionSearchArticlesController";
import { EconomicdiscussionSearchCommentsController } from "./controllers/economicDiscussion/search/comments/EconomicdiscussionSearchCommentsController";
import { EconomicdiscussionMemberSearchCategoriesController } from "./controllers/economicDiscussion/member/search/categories/EconomicdiscussionMemberSearchCategoriesController";
import { EconomicdiscussionMemberSearchQueriesPopularController } from "./controllers/economicDiscussion/member/search/queries/popular/EconomicdiscussionMemberSearchQueriesPopularController";
import { EconomicdiscussionMemberSearchHistoryController } from "./controllers/economicDiscussion/member/search/history/EconomicdiscussionMemberSearchHistoryController";
import { EconomicdiscussionModeratorSearchAnalyticsController } from "./controllers/economicDiscussion/moderator/search/analytics/EconomicdiscussionModeratorSearchAnalyticsController";
import { EconomicdiscussionDiscoveryController } from "./controllers/economicDiscussion/discovery/trending/EconomicdiscussionDiscoveryController";
import { EconomicdiscussionMemberDiscoveryRecommendationsController } from "./controllers/economicDiscussion/member/discovery/recommendations/EconomicdiscussionMemberDiscoveryRecommendationsController";
import { EconomicdiscussionModeratorDiscoveryRecommendationsController } from "./controllers/economicDiscussion/moderator/discovery/recommendations/EconomicdiscussionModeratorDiscoveryRecommendationsController";
import { EconomicdiscussionDiscoveryPopular_tagsController } from "./controllers/economicDiscussion/discovery/popular-tags/EconomicdiscussionDiscoveryPopular_tagsController";
import { EconomicdiscussionMemberDiscoveryRecently_viewedController } from "./controllers/economicDiscussion/member/discovery/recently-viewed/EconomicdiscussionMemberDiscoveryRecently_viewedController";
import { EconomicdiscussionGuestDiscoveryRecently_viewedController } from "./controllers/economicDiscussion/guest/discovery/recently-viewed/EconomicdiscussionGuestDiscoveryRecently_viewedController";
import { EconomicdiscussionDiscoveryRecently_viewedController } from "./controllers/economicDiscussion/discovery/recently-viewed/EconomicdiscussionDiscoveryRecently_viewedController";

@Module({
  controllers: [
    AuthGuestController,
    AuthMemberController,
    AuthModeratorController,
    EconomicdiscussionModeratorSystem_settingsController,
    EconomicdiscussionModeratorGuestsController,
    EconomicdiscussionGuestsSessionsController,
    EconomicdiscussionModeratorGuestsSessionsController,
    EconomicdiscussionModeratorMembersController,
    EconomicdiscussionMemberMembersController,
    EconomicdiscussionMemberMembersSessionsController,
    EconomicdiscussionModeratorModeratorsController,
    EconomicdiscussionModeratorModeratorsSessionsController,
    EconomicdiscussionArticlesController,
    EconomicdiscussionMemberArticlesController,
    EconomicdiscussionModeratorArticlesController,
    EconomicdiscussionMemberArticlesVersionsController,
    EconomicdiscussionCategoriesController,
    EconomicdiscussionModeratorCategoriesController,
    EconomicdiscussionMemberArticlesCategoriesController,
    EconomicdiscussionModeratorArticlesCategoriesController,
    EconomicdiscussionMemberArticlesAttachmentfilesController,
    EconomicdiscussionArticlesCommentsController,
    EconomicdiscussionMemberArticlesCommentsController,
    EconomicdiscussionModeratorArticlesCommentsController,
    EconomicdiscussionArticlesAttachmentsController,
    EconomicdiscussionMemberArticlesAttachmentsController,
    EconomicdiscussionModeratorArticlesAttachmentsController,
    EconomicdiscussionGuestSearchGlobalController,
    EconomicdiscussionMemberSearchGlobalController,
    EconomicdiscussionModeratorSearchGlobalController,
    EconomicdiscussionSearchArticlesController,
    EconomicdiscussionSearchCommentsController,
    EconomicdiscussionMemberSearchCategoriesController,
    EconomicdiscussionMemberSearchQueriesPopularController,
    EconomicdiscussionMemberSearchHistoryController,
    EconomicdiscussionModeratorSearchAnalyticsController,
    EconomicdiscussionDiscoveryController,
    EconomicdiscussionMemberDiscoveryRecommendationsController,
    EconomicdiscussionModeratorDiscoveryRecommendationsController,
    EconomicdiscussionDiscoveryPopular_tagsController,
    EconomicdiscussionMemberDiscoveryRecently_viewedController,
    EconomicdiscussionGuestDiscoveryRecently_viewedController,
    EconomicdiscussionDiscoveryRecently_viewedController,
  ],
})
export class MyModule {}
