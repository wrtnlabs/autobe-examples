import { Module } from "@nestjs/common";

import { AuthUserController } from "./controllers/auth/user/AuthUserController";
import { AuthModeratorController } from "./controllers/auth/moderator/AuthModeratorController";
import { AuthAdministratorController } from "./controllers/auth/administrator/AuthAdministratorController";
import { CommunityforumUsersController } from "./controllers/communityForum/users/CommunityforumUsersController";
import { CommunityforumUserUsersController } from "./controllers/communityForum/user/users/CommunityforumUserUsersController";
import { CommunityforumUsersPostsController } from "./controllers/communityForum/users/posts/CommunityforumUsersPostsController";
import { CommunityforumUsersCommentsController } from "./controllers/communityForum/users/comments/CommunityforumUsersCommentsController";
import { CommunityforumUsersKarmaController } from "./controllers/communityForum/users/karma/CommunityforumUsersKarmaController";
import { CommunityforumUserUsersSessionsController } from "./controllers/communityForum/user/users/sessions/CommunityforumUserUsersSessionsController";
import { CommunityforumAdministratorUsersSessionsController } from "./controllers/communityForum/administrator/users/sessions/CommunityforumAdministratorUsersSessionsController";
import { CommunityforumCommunitiesController } from "./controllers/communityForum/communities/CommunityforumCommunitiesController";
import { CommunityforumUserCommunitiesController } from "./controllers/communityForum/user/communities/CommunityforumUserCommunitiesController";
import { CommunityforumCommunitiesPostsController } from "./controllers/communityForum/communities/posts/CommunityforumCommunitiesPostsController";
import { CommunityforumCommunitiesMembershipsController } from "./controllers/communityForum/communities/memberships/CommunityforumCommunitiesMembershipsController";
import { CommunityforumUserPostsController } from "./controllers/communityForum/user/posts/CommunityforumUserPostsController";
import { CommunityforumPostsController } from "./controllers/communityForum/posts/CommunityforumPostsController";
import { CommunityforumModeratorPostsController } from "./controllers/communityForum/moderator/posts/CommunityforumModeratorPostsController";
import { CommunityforumAdministratorPostsController } from "./controllers/communityForum/administrator/posts/CommunityforumAdministratorPostsController";
import { CommunityforumPostsCommentsController } from "./controllers/communityForum/posts/comments/CommunityforumPostsCommentsController";
import { CommunityforumUserPostsCommentsController } from "./controllers/communityForum/user/posts/comments/CommunityforumUserPostsCommentsController";
import { CommunityforumCommentsController } from "./controllers/communityForum/comments/CommunityforumCommentsController";
import { CommunityforumUserCommentsController } from "./controllers/communityForum/user/comments/CommunityforumUserCommentsController";
import { CommunityforumCommentsRepliesController } from "./controllers/communityForum/comments/replies/CommunityforumCommentsRepliesController";
import { CommunityforumUserCommentsRepliesController } from "./controllers/communityForum/user/comments/replies/CommunityforumUserCommentsRepliesController";
import { CommunityforumUserPostsVotesController } from "./controllers/communityForum/user/posts/votes/CommunityforumUserPostsVotesController";
import { CommunityforumUserCommentsVotesController } from "./controllers/communityForum/user/comments/votes/CommunityforumUserCommentsVotesController";
import { CommunityforumUserCommunitiesSubscriptionsController } from "./controllers/communityForum/user/communities/subscriptions/CommunityforumUserCommunitiesSubscriptionsController";
import { CommunityforumUserUsersSubscriptionsController } from "./controllers/communityForum/user/users/subscriptions/CommunityforumUserUsersSubscriptionsController";
import { CommunityforumModeratorReportsController } from "./controllers/communityForum/moderator/reports/CommunityforumModeratorReportsController";
import { CommunityforumUserReportsController } from "./controllers/communityForum/user/reports/CommunityforumUserReportsController";
import { CommunityforumAdministratorReportsController } from "./controllers/communityForum/administrator/reports/CommunityforumAdministratorReportsController";
import { CommunityforumAdministratorModeration_actionsController } from "./controllers/communityForum/administrator/moderation-actions/CommunityforumAdministratorModeration_actionsController";
import { CommunityforumModeratorModeration_actionsController } from "./controllers/communityForum/moderator/moderation-actions/CommunityforumModeratorModeration_actionsController";
import { CommunityforumAdministratorModeratorsController } from "./controllers/communityForum/administrator/moderators/CommunityforumAdministratorModeratorsController";
import { CommunityforumModeratorModeratorsController } from "./controllers/communityForum/moderator/moderators/CommunityforumModeratorModeratorsController";
import { CommunityforumModeratorModeratorsSessionsController } from "./controllers/communityForum/moderator/moderators/sessions/CommunityforumModeratorModeratorsSessionsController";
import { CommunityforumAdministratorModeratorsSessionsController } from "./controllers/communityForum/administrator/moderators/sessions/CommunityforumAdministratorModeratorsSessionsController";
import { CommunityforumAdministratorCommunitiesModeratorsController } from "./controllers/communityForum/administrator/communities/moderators/CommunityforumAdministratorCommunitiesModeratorsController";
import { CommunityforumCommunitiesModeratorsController } from "./controllers/communityForum/communities/moderators/CommunityforumCommunitiesModeratorsController";

@Module({
  controllers: [
    AuthUserController,
    AuthModeratorController,
    AuthAdministratorController,
    CommunityforumUsersController,
    CommunityforumUserUsersController,
    CommunityforumUsersPostsController,
    CommunityforumUsersCommentsController,
    CommunityforumUsersKarmaController,
    CommunityforumUserUsersSessionsController,
    CommunityforumAdministratorUsersSessionsController,
    CommunityforumCommunitiesController,
    CommunityforumUserCommunitiesController,
    CommunityforumCommunitiesPostsController,
    CommunityforumCommunitiesMembershipsController,
    CommunityforumUserPostsController,
    CommunityforumPostsController,
    CommunityforumModeratorPostsController,
    CommunityforumAdministratorPostsController,
    CommunityforumPostsCommentsController,
    CommunityforumUserPostsCommentsController,
    CommunityforumCommentsController,
    CommunityforumUserCommentsController,
    CommunityforumCommentsRepliesController,
    CommunityforumUserCommentsRepliesController,
    CommunityforumUserPostsVotesController,
    CommunityforumUserCommentsVotesController,
    CommunityforumUserCommunitiesSubscriptionsController,
    CommunityforumUserUsersSubscriptionsController,
    CommunityforumModeratorReportsController,
    CommunityforumUserReportsController,
    CommunityforumAdministratorReportsController,
    CommunityforumAdministratorModeration_actionsController,
    CommunityforumModeratorModeration_actionsController,
    CommunityforumAdministratorModeratorsController,
    CommunityforumModeratorModeratorsController,
    CommunityforumModeratorModeratorsSessionsController,
    CommunityforumAdministratorModeratorsSessionsController,
    CommunityforumAdministratorCommunitiesModeratorsController,
    CommunityforumCommunitiesModeratorsController,
  ],
})
export class MyModule {}
