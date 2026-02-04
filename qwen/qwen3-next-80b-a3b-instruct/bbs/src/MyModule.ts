import { Module } from "@nestjs/common";

import { EconomicdiscussionAdministratorAdminAnalyticsArticlesController } from "./controllers/economicDiscussion/administrator/admin/analytics/articles/EconomicdiscussionAdministratorAdminAnalyticsArticlesController";
import { EconomicdiscussionAdministratorAdminAnalyticsMost_commentedController } from "./controllers/economicDiscussion/administrator/admin/analytics/most-commented/EconomicdiscussionAdministratorAdminAnalyticsMost_commentedController";
import { EconomicdiscussionAdministratorAdminAnalyticsTagsController } from "./controllers/economicDiscussion/administrator/admin/analytics/tags/EconomicdiscussionAdministratorAdminAnalyticsTagsController";
import { EconomicdiscussionAdministratorBansController } from "./controllers/economicDiscussion/administrator/bans/EconomicdiscussionAdministratorBansController";
import { EconomicdiscussionAdministratorSectionsController } from "./controllers/economicDiscussion/administrator/sections/EconomicdiscussionAdministratorSectionsController";
import { EconomicdiscussionAdministratorUnbansController } from "./controllers/economicDiscussion/administrator/unbans/EconomicdiscussionAdministratorUnbansController";
import { EconomicdiscussionArticlesController } from "./controllers/economicDiscussion/articles/EconomicdiscussionArticlesController";
import { EconomicdiscussionAuthAdministratorController } from "./controllers/economicDiscussion/auth/administrator/EconomicdiscussionAuthAdministratorController";
import { EconomicdiscussionAuthCitizenController } from "./controllers/economicDiscussion/auth/citizen/EconomicdiscussionAuthCitizenController";
import { EconomicdiscussionAuthSuperadministratorController } from "./controllers/economicDiscussion/auth/superAdministrator/EconomicdiscussionAuthSuperadministratorController";
import { EconomicdiscussionCitizenArticlesController } from "./controllers/economicDiscussion/citizen/articles/EconomicdiscussionCitizenArticlesController";
import { EconomicdiscussionCitizenArticlesCommentsController } from "./controllers/economicDiscussion/citizen/articles/comments/EconomicdiscussionCitizenArticlesCommentsController";
import { EconomicdiscussionCitizenCommentsController } from "./controllers/economicDiscussion/citizen/comments/EconomicdiscussionCitizenCommentsController";
import { EconomicdiscussionCitizenProfileController } from "./controllers/economicDiscussion/citizen/profile/EconomicdiscussionCitizenProfileController";
import { EconomicdiscussionSearchArticlesController } from "./controllers/economicDiscussion/search/articles/EconomicdiscussionSearchArticlesController";
import { EconomicdiscussionSectionsController } from "./controllers/economicDiscussion/sections/EconomicdiscussionSectionsController";
import { EconomicdiscussionSectionsArticlesController } from "./controllers/economicDiscussion/sections/articles/EconomicdiscussionSectionsArticlesController";
import { EconomicdiscussionSuperadministratorAdminAnalyticsArticlesController } from "./controllers/economicDiscussion/superAdministrator/admin/analytics/articles/EconomicdiscussionSuperadministratorAdminAnalyticsArticlesController";
import { EconomicdiscussionSuperadministratorAdminAnalyticsMost_commentedController } from "./controllers/economicDiscussion/superAdministrator/admin/analytics/most-commented/EconomicdiscussionSuperadministratorAdminAnalyticsMost_commentedController";
import { EconomicdiscussionSuperadministratorAdminAnalyticsTagsController } from "./controllers/economicDiscussion/superAdministrator/admin/analytics/tags/EconomicdiscussionSuperadministratorAdminAnalyticsTagsController";
import { EconomicdiscussionSuperadministratorAdministrator_request_decisionsController } from "./controllers/economicDiscussion/superAdministrator/administrator-request-decisions/EconomicdiscussionSuperadministratorAdministrator_request_decisionsController";
import { EconomicdiscussionSuperadministratorAdministrator_requestsController } from "./controllers/economicDiscussion/superAdministrator/administrator-requests/EconomicdiscussionSuperadministratorAdministrator_requestsController";
import { EconomicdiscussionSuperadministratorAdministrator_requestsPendingController } from "./controllers/economicDiscussion/superAdministrator/administrator-requests/pending/EconomicdiscussionSuperadministratorAdministrator_requestsPendingController";

@Module({
  controllers: [
    EconomicdiscussionAuthCitizenController,
    EconomicdiscussionAuthAdministratorController,
    EconomicdiscussionAuthSuperadministratorController,
    EconomicdiscussionSectionsController,
    EconomicdiscussionAdministratorSectionsController,
    EconomicdiscussionArticlesController,
    EconomicdiscussionCitizenArticlesController,
    EconomicdiscussionSectionsArticlesController,
    EconomicdiscussionCitizenArticlesCommentsController,
    EconomicdiscussionCitizenCommentsController,
    EconomicdiscussionSuperadministratorAdministrator_request_decisionsController,
    EconomicdiscussionSuperadministratorAdministrator_requestsController,
    EconomicdiscussionAdministratorBansController,
    EconomicdiscussionAdministratorUnbansController,
    EconomicdiscussionCitizenProfileController,
    EconomicdiscussionAdministratorAdminAnalyticsArticlesController,
    EconomicdiscussionSuperadministratorAdminAnalyticsArticlesController,
    EconomicdiscussionAdministratorAdminAnalyticsTagsController,
    EconomicdiscussionSuperadministratorAdminAnalyticsTagsController,
    EconomicdiscussionAdministratorAdminAnalyticsMost_commentedController,
    EconomicdiscussionSuperadministratorAdminAnalyticsMost_commentedController,
    EconomicdiscussionSuperadministratorAdministrator_requestsPendingController,
    EconomicdiscussionSearchArticlesController,
  ],
})
export class MyModule {}
