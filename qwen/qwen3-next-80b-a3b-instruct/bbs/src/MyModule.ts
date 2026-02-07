import { Module } from "@nestjs/common";

import { EconomicboardAdministratorAnalyticsCommentsController } from "./controllers/economicBoard/administrator/analytics/comments/EconomicboardAdministratorAnalyticsCommentsController";
import { EconomicboardAdministratorAuditCreationsController } from "./controllers/economicBoard/administrator/audit/creations/EconomicboardAdministratorAuditCreationsController";
import { EconomicboardAdministratorAuditDeletionsController } from "./controllers/economicBoard/administrator/audit/deletions/EconomicboardAdministratorAuditDeletionsController";
import { EconomicboardAdministratorBansController } from "./controllers/economicBoard/administrator/bans/EconomicboardAdministratorBansController";
import { EconomicboardAdministratorMetricsController } from "./controllers/economicBoard/administrator/metrics/EconomicboardAdministratorMetricsController";
import { EconomicboardAdministratorModerationCommentsController } from "./controllers/economicBoard/administrator/moderation/comments/EconomicboardAdministratorModerationCommentsController";
import { EconomicboardAdministratorModerationUnmoderatedController } from "./controllers/economicBoard/administrator/moderation/unmoderated/EconomicboardAdministratorModerationUnmoderatedController";
import { EconomicboardAdministratorReportsCommentsController } from "./controllers/economicBoard/administrator/reports/comments/EconomicboardAdministratorReportsCommentsController";
import { EconomicboardAdministratorReportsCommentsSectionController } from "./controllers/economicBoard/administrator/reports/comments/section/EconomicboardAdministratorReportsCommentsSectionController";
import { EconomicboardAdministratorSectionsController } from "./controllers/economicBoard/administrator/sections/EconomicboardAdministratorSectionsController";
import { EconomicboardAdministratorTagsController } from "./controllers/economicBoard/administrator/tags/popular/EconomicboardAdministratorTagsController";
import { EconomicboardArticlesController } from "./controllers/economicBoard/articles/EconomicboardArticlesController";
import { EconomicboardArticlesFilesController } from "./controllers/economicBoard/articles/files/EconomicboardArticlesFilesController";
import { EconomicboardArticlesImagesController } from "./controllers/economicBoard/articles/images/EconomicboardArticlesImagesController";
import { EconomicboardArticlesStatsController } from "./controllers/economicBoard/articles/stats/EconomicboardArticlesStatsController";
import { EconomicboardArticlesTagsController } from "./controllers/economicBoard/articles/tags/EconomicboardArticlesTagsController";
import { EconomicboardAuthAdministratorController } from "./controllers/economicBoard/auth/administrator/EconomicboardAuthAdministratorController";
import { EconomicboardAuthCitizenController } from "./controllers/economicBoard/auth/citizen/EconomicboardAuthCitizenController";
import { EconomicboardAuthSuperadministratorController } from "./controllers/economicBoard/auth/superAdministrator/EconomicboardAuthSuperadministratorController";
import { EconomicboardCitizenAdmin_requestsController } from "./controllers/economicBoard/citizen/admin-requests/EconomicboardCitizenAdmin_requestsController";
import { EconomicboardCitizenArticlesCommentsController } from "./controllers/economicBoard/citizen/articles/comments/EconomicboardCitizenArticlesCommentsController";
import { EconomicboardCitizenCommentsController } from "./controllers/economicBoard/citizen/comments/EconomicboardCitizenCommentsController";
import { EconomicboardCitizenEmail_verificationsController } from "./controllers/economicBoard/citizen/email-verifications/EconomicboardCitizenEmail_verificationsController";
import { EconomicboardCitizenPassword_resetsController } from "./controllers/economicBoard/citizen/password-resets/EconomicboardCitizenPassword_resetsController";
import { EconomicboardCitizenProfileController } from "./controllers/economicBoard/citizen/profile/EconomicboardCitizenProfileController";
import { EconomicboardCitizenProfileStatsController } from "./controllers/economicBoard/citizen/profile/stats/EconomicboardCitizenProfileStatsController";
import { EconomicboardCitizenSessionsController } from "./controllers/economicBoard/citizen/sessions/EconomicboardCitizenSessionsController";
import { EconomicboardCitizenTagsController } from "./controllers/economicBoard/citizen/tags/popular/EconomicboardCitizenTagsController";
import { EconomicboardSearchController } from "./controllers/economicBoard/search/EconomicboardSearchController";
import { EconomicboardSectionsController } from "./controllers/economicBoard/sections/EconomicboardSectionsController";
import { EconomicboardSuperadministratorAdmin_requestsController } from "./controllers/economicBoard/superAdministrator/admin-requests/EconomicboardSuperadministratorAdmin_requestsController";
import { EconomicboardSuperadministratorAuditCreationsController } from "./controllers/economicBoard/superAdministrator/audit/creations/EconomicboardSuperadministratorAuditCreationsController";
import { EconomicboardSuperadministratorAuditDeletionsController } from "./controllers/economicBoard/superAdministrator/audit/deletions/EconomicboardSuperadministratorAuditDeletionsController";
import { EconomicboardSuperadministratorMetricsController } from "./controllers/economicBoard/superAdministrator/metrics/EconomicboardSuperadministratorMetricsController";
import { EconomicboardSuperadministratorSectionsController } from "./controllers/economicBoard/superAdministrator/sections/EconomicboardSuperadministratorSectionsController";
import { EconomicboardTagsController } from "./controllers/economicBoard/tags/EconomicboardTagsController";

@Module({
  controllers: [
    EconomicboardAuthCitizenController,
    EconomicboardAuthAdministratorController,
    EconomicboardAuthSuperadministratorController,
    EconomicboardCitizenProfileController,
    EconomicboardCitizenSessionsController,
    EconomicboardCitizenEmail_verificationsController,
    EconomicboardCitizenPassword_resetsController,
    EconomicboardArticlesController,
    EconomicboardArticlesFilesController,
    EconomicboardArticlesImagesController,
    EconomicboardArticlesStatsController,
    EconomicboardArticlesTagsController,
    EconomicboardCitizenArticlesCommentsController,
    EconomicboardCitizenCommentsController,
    EconomicboardSectionsController,
    EconomicboardAdministratorSectionsController,
    EconomicboardSuperadministratorSectionsController,
    EconomicboardAdministratorBansController,
    EconomicboardSearchController,
    EconomicboardTagsController,
    EconomicboardCitizenAdmin_requestsController,
    EconomicboardSuperadministratorAdmin_requestsController,
    EconomicboardCitizenProfileStatsController,
    EconomicboardAdministratorMetricsController,
    EconomicboardSuperadministratorMetricsController,
    EconomicboardCitizenTagsController,
    EconomicboardAdministratorTagsController,
    EconomicboardAdministratorReportsCommentsController,
    EconomicboardAdministratorReportsCommentsSectionController,
    EconomicboardAdministratorAnalyticsCommentsController,
    EconomicboardAdministratorModerationUnmoderatedController,
    EconomicboardAdministratorModerationCommentsController,
    EconomicboardAdministratorAuditCreationsController,
    EconomicboardSuperadministratorAuditCreationsController,
    EconomicboardAdministratorAuditDeletionsController,
    EconomicboardSuperadministratorAuditDeletionsController,
  ],
})
export class MyModule {}
