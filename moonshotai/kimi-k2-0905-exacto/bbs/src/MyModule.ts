import { Module } from "@nestjs/common";

import { AuthVisitorController } from "./controllers/auth/visitor/AuthVisitorController";
import { AuthMembersController } from "./controllers/auth/members/AuthMembersController";
import { AuthModeratorController } from "./controllers/auth/moderator/AuthModeratorController";
import { AuthModeratorMeController } from "./controllers/auth/moderator/me/AuthModeratorMeController";
import { AuthModeratorPasswordController } from "./controllers/auth/moderator/password/AuthModeratorPasswordController";
import { PoliticsbbsCategoriesController } from "./controllers/politicsBbs/categories/PoliticsbbsCategoriesController";
import { PoliticsbbsModeratorCategoriesController } from "./controllers/politicsBbs/moderator/categories/PoliticsbbsModeratorCategoriesController";
import { PoliticsbbsArticlesController } from "./controllers/politicsBbs/articles/PoliticsbbsArticlesController";
import { PoliticsbbsMemberArticlesController } from "./controllers/politicsBbs/member/articles/PoliticsbbsMemberArticlesController";
import { PoliticsbbsArticlesSnapshotsController } from "./controllers/politicsBbs/articles/snapshots/PoliticsbbsArticlesSnapshotsController";
import { PoliticsbbsArticlesCommentsController } from "./controllers/politicsBbs/articles/comments/PoliticsbbsArticlesCommentsController";
import { PoliticsbbsCommentsController } from "./controllers/politicsBbs/comments/PoliticsbbsCommentsController";
import { PoliticsbbsMemberArticlesCommentsController } from "./controllers/politicsBbs/member/articles/comments/PoliticsbbsMemberArticlesCommentsController";
import { PoliticsbbsMemberCommentsController } from "./controllers/politicsBbs/member/comments/PoliticsbbsMemberCommentsController";
import { PoliticsbbsModeratorModeratorContentReviewController } from "./controllers/politicsBbs/moderator/moderator/content/review/PoliticsbbsModeratorModeratorContentReviewController";
import { PoliticsbbsModeratorModeratorContentApproveController } from "./controllers/politicsBbs/moderator/moderator/content/approve/PoliticsbbsModeratorModeratorContentApproveController";
import { PoliticsbbsModeratorContentReviewController } from "./controllers/politicsBbs/moderator/content/review/PoliticsbbsModeratorContentReviewController";
import { PoliticsbbsModeratorContentApproveController } from "./controllers/politicsBbs/moderator/content/approve/PoliticsbbsModeratorContentApproveController";
import { PoliticsbbsModeratorModeratorContentController } from "./controllers/politicsBbs/moderator/moderator/content/reject/PoliticsbbsModeratorModeratorContentController";
import { PoliticsbbsMemberMembersMeArticlesController } from "./controllers/politicsBbs/member/members/me/articles/PoliticsbbsMemberMembersMeArticlesController";
import { PoliticsbbsStatisticsPopularController } from "./controllers/politicsBbs/statistics/popular/PoliticsbbsStatisticsPopularController";
import { PoliticsbbsSearchArticlesController } from "./controllers/politicsBbs/search/articles/PoliticsbbsSearchArticlesController";
import { PoliticsbbsSearchUnifiedController } from "./controllers/politicsBbs/search/unified/PoliticsbbsSearchUnifiedController";
import { PoliticsbbsMemberUploadsController } from "./controllers/politicsBbs/member/uploads/PoliticsbbsMemberUploadsController";
import { PoliticsbbsModeratorUploadsController } from "./controllers/politicsBbs/moderator/uploads/PoliticsbbsModeratorUploadsController";
import { PoliticsbbsUploadsController } from "./controllers/politicsBbs/uploads/PoliticsbbsUploadsController";

@Module({
  controllers: [
    AuthVisitorController,
    AuthMembersController,
    AuthModeratorController,
    AuthModeratorMeController,
    AuthModeratorPasswordController,
    PoliticsbbsCategoriesController,
    PoliticsbbsModeratorCategoriesController,
    PoliticsbbsArticlesController,
    PoliticsbbsMemberArticlesController,
    PoliticsbbsArticlesSnapshotsController,
    PoliticsbbsArticlesCommentsController,
    PoliticsbbsCommentsController,
    PoliticsbbsMemberArticlesCommentsController,
    PoliticsbbsMemberCommentsController,
    PoliticsbbsModeratorModeratorContentReviewController,
    PoliticsbbsModeratorModeratorContentApproveController,
    PoliticsbbsModeratorContentReviewController,
    PoliticsbbsModeratorContentApproveController,
    PoliticsbbsModeratorModeratorContentController,
    PoliticsbbsMemberMembersMeArticlesController,
    PoliticsbbsStatisticsPopularController,
    PoliticsbbsSearchArticlesController,
    PoliticsbbsSearchUnifiedController,
    PoliticsbbsMemberUploadsController,
    PoliticsbbsModeratorUploadsController,
    PoliticsbbsUploadsController,
  ],
})
export class MyModule {}
