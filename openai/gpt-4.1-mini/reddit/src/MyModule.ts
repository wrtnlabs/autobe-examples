import { Module } from "@nestjs/common";

import { AuthGuestController } from "./controllers/auth/guest/AuthGuestController";
import { AuthUserController } from "./controllers/auth/user/AuthUserController";
import { AuthModeratorController } from "./controllers/auth/moderator/AuthModeratorController";
import { AuthAdminController } from "./controllers/auth/admin/AuthAdminController";
import { RedditcommunityAdminGuestsController } from "./controllers/redditCommunity/admin/guests/RedditcommunityAdminGuestsController";
import { RedditcommunityGuestsController } from "./controllers/redditCommunity/guests/RedditcommunityGuestsController";
import { RedditcommunityAdminGuestsSessionsController } from "./controllers/redditCommunity/admin/guests/sessions/RedditcommunityAdminGuestsSessionsController";
import { RedditcommunityGuestsSessionsController } from "./controllers/redditCommunity/guests/sessions/RedditcommunityGuestsSessionsController";
import { RedditcommunityAdminUsersController } from "./controllers/redditCommunity/admin/users/RedditcommunityAdminUsersController";
import { RedditcommunityUsersController } from "./controllers/redditCommunity/users/RedditcommunityUsersController";
import { RedditcommunityUserUsersController } from "./controllers/redditCommunity/user/users/RedditcommunityUserUsersController";
import { RedditcommunityAdminUsersSessionsController } from "./controllers/redditCommunity/admin/users/sessions/RedditcommunityAdminUsersSessionsController";
import { RedditcommunityUserUsersSessionsController } from "./controllers/redditCommunity/user/users/sessions/RedditcommunityUserUsersSessionsController";
import { RedditcommunityAdminModeratorsController } from "./controllers/redditCommunity/admin/moderators/RedditcommunityAdminModeratorsController";
import { RedditcommunityModeratorModeratorsController } from "./controllers/redditCommunity/moderator/moderators/RedditcommunityModeratorModeratorsController";
import { RedditcommunityAdminModeratorsSessionsController } from "./controllers/redditCommunity/admin/moderators/sessions/RedditcommunityAdminModeratorsSessionsController";
import { RedditcommunityModeratorModeratorsSessionsController } from "./controllers/redditCommunity/moderator/moderators/sessions/RedditcommunityModeratorModeratorsSessionsController";
import { RedditcommunityAdminAdminsController } from "./controllers/redditCommunity/admin/admins/RedditcommunityAdminAdminsController";
import { RedditcommunityAdminAdminsSessionsController } from "./controllers/redditCommunity/admin/admins/sessions/RedditcommunityAdminAdminsSessionsController";
import { RedditcommunityCommunitiesController } from "./controllers/redditCommunity/communities/RedditcommunityCommunitiesController";
import { RedditcommunityUserCommunitiesController } from "./controllers/redditCommunity/user/communities/RedditcommunityUserCommunitiesController";
import { RedditcommunityModeratorCommunitiesController } from "./controllers/redditCommunity/moderator/communities/RedditcommunityModeratorCommunitiesController";
import { RedditcommunityAdminCommunitiesController } from "./controllers/redditCommunity/admin/communities/RedditcommunityAdminCommunitiesController";
import { RedditcommunityUserCommunitiesModeratorsController } from "./controllers/redditCommunity/user/communities/moderators/RedditcommunityUserCommunitiesModeratorsController";
import { RedditcommunityModeratorCommunitiesModeratorsController } from "./controllers/redditCommunity/moderator/communities/moderators/RedditcommunityModeratorCommunitiesModeratorsController";
import { RedditcommunityAdminCommunitiesModeratorsController } from "./controllers/redditCommunity/admin/communities/moderators/RedditcommunityAdminCommunitiesModeratorsController";
import { RedditcommunityModeratorCommunitiesSettingsController } from "./controllers/redditCommunity/moderator/communities/settings/RedditcommunityModeratorCommunitiesSettingsController";
import { RedditcommunityAdminCommunitiesSettingsController } from "./controllers/redditCommunity/admin/communities/settings/RedditcommunityAdminCommunitiesSettingsController";
import { RedditcommunityCommunitiesPostsController } from "./controllers/redditCommunity/communities/posts/RedditcommunityCommunitiesPostsController";
import { RedditcommunityUserCommunitiesPostsController } from "./controllers/redditCommunity/user/communities/posts/RedditcommunityUserCommunitiesPostsController";
import { RedditcommunityModeratorCommunitiesPostsController } from "./controllers/redditCommunity/moderator/communities/posts/RedditcommunityModeratorCommunitiesPostsController";
import { RedditcommunityAdminCommunitiesPostsController } from "./controllers/redditCommunity/admin/communities/posts/RedditcommunityAdminCommunitiesPostsController";
import { RedditcommunityUserCommunitiesPostsCommentsController } from "./controllers/redditCommunity/user/communities/posts/comments/RedditcommunityUserCommunitiesPostsCommentsController";
import { RedditcommunityModeratorCommunitiesPostsCommentsController } from "./controllers/redditCommunity/moderator/communities/posts/comments/RedditcommunityModeratorCommunitiesPostsCommentsController";
import { RedditcommunityAdminCommunitiesPostsCommentsController } from "./controllers/redditCommunity/admin/communities/posts/comments/RedditcommunityAdminCommunitiesPostsCommentsController";
import { RedditcommunityCommunitiesPostsCommentsController } from "./controllers/redditCommunity/communities/posts/comments/RedditcommunityCommunitiesPostsCommentsController";
import { RedditcommunityUserCommunitiesPostsVotesController } from "./controllers/redditCommunity/user/communities/posts/votes/RedditcommunityUserCommunitiesPostsVotesController";
import { RedditcommunityUserCommunitiesCommentsVotesController } from "./controllers/redditCommunity/user/communities/comments/votes/RedditcommunityUserCommunitiesCommentsVotesController";
import { RedditcommunityModeratorCommunitiesCommentsVotesController } from "./controllers/redditCommunity/moderator/communities/comments/votes/RedditcommunityModeratorCommunitiesCommentsVotesController";
import { RedditcommunityAdminCommunitiesCommentsVotesController } from "./controllers/redditCommunity/admin/communities/comments/votes/RedditcommunityAdminCommunitiesCommentsVotesController";
import { RedditcommunityUserCommunitiesSubscriptionsController } from "./controllers/redditCommunity/user/communities/subscriptions/RedditcommunityUserCommunitiesSubscriptionsController";
import { RedditcommunityUserUsersProfilesController } from "./controllers/redditCommunity/user/users/profiles/RedditcommunityUserUsersProfilesController";
import { RedditcommunityUserUsersCommentsController } from "./controllers/redditCommunity/user/users/comments/RedditcommunityUserUsersCommentsController";
import { RedditcommunityUserUsersPostsController } from "./controllers/redditCommunity/user/users/posts/RedditcommunityUserUsersPostsController";
import { RedditcommunityUserUsersKarmaController } from "./controllers/redditCommunity/user/users/karma/RedditcommunityUserUsersKarmaController";
import { RedditcommunityModeratorContent_reportsController } from "./controllers/redditCommunity/moderator/content-reports/RedditcommunityModeratorContent_reportsController";
import { RedditcommunityAdminContent_reportsController } from "./controllers/redditCommunity/admin/content-reports/RedditcommunityAdminContent_reportsController";
import { RedditcommunityUserContent_reportsController } from "./controllers/redditCommunity/user/content-reports/RedditcommunityUserContent_reportsController";
import { RedditcommunityModeratorModeratorsActionsController } from "./controllers/redditCommunity/moderator/moderators/actions/RedditcommunityModeratorModeratorsActionsController";
import { RedditcommunityAdminRedditcommunitysystemconfigurationsController } from "./controllers/redditCommunity/admin/redditCommunitySystemConfigurations/RedditcommunityAdminRedditcommunitysystemconfigurationsController";
import { RedditcommunityModeratorRedditcommunitysystemconfigurationsController } from "./controllers/redditCommunity/moderator/redditCommunitySystemConfigurations/RedditcommunityModeratorRedditcommunitysystemconfigurationsController";
import { RedditcommunityRedditcommunitycontenttypesController } from "./controllers/redditCommunity/redditCommunityContentTypes/RedditcommunityRedditcommunitycontenttypesController";
import { RedditcommunityAdminRedditcommunitycontenttypesController } from "./controllers/redditCommunity/admin/redditCommunityContentTypes/RedditcommunityAdminRedditcommunitycontenttypesController";
import { RedditcommunityRedditcommunityreportreasonsController } from "./controllers/redditCommunity/redditCommunityReportReasons/RedditcommunityRedditcommunityreportreasonsController";
import { RedditcommunityAdminRedditcommunityreportreasonsController } from "./controllers/redditCommunity/admin/redditCommunityReportReasons/RedditcommunityAdminRedditcommunityreportreasonsController";

@Module({
  controllers: [
    AuthGuestController,
    AuthUserController,
    AuthModeratorController,
    AuthAdminController,
    RedditcommunityAdminGuestsController,
    RedditcommunityGuestsController,
    RedditcommunityAdminGuestsSessionsController,
    RedditcommunityGuestsSessionsController,
    RedditcommunityAdminUsersController,
    RedditcommunityUsersController,
    RedditcommunityUserUsersController,
    RedditcommunityAdminUsersSessionsController,
    RedditcommunityUserUsersSessionsController,
    RedditcommunityAdminModeratorsController,
    RedditcommunityModeratorModeratorsController,
    RedditcommunityAdminModeratorsSessionsController,
    RedditcommunityModeratorModeratorsSessionsController,
    RedditcommunityAdminAdminsController,
    RedditcommunityAdminAdminsSessionsController,
    RedditcommunityCommunitiesController,
    RedditcommunityUserCommunitiesController,
    RedditcommunityModeratorCommunitiesController,
    RedditcommunityAdminCommunitiesController,
    RedditcommunityUserCommunitiesModeratorsController,
    RedditcommunityModeratorCommunitiesModeratorsController,
    RedditcommunityAdminCommunitiesModeratorsController,
    RedditcommunityModeratorCommunitiesSettingsController,
    RedditcommunityAdminCommunitiesSettingsController,
    RedditcommunityCommunitiesPostsController,
    RedditcommunityUserCommunitiesPostsController,
    RedditcommunityModeratorCommunitiesPostsController,
    RedditcommunityAdminCommunitiesPostsController,
    RedditcommunityUserCommunitiesPostsCommentsController,
    RedditcommunityModeratorCommunitiesPostsCommentsController,
    RedditcommunityAdminCommunitiesPostsCommentsController,
    RedditcommunityCommunitiesPostsCommentsController,
    RedditcommunityUserCommunitiesPostsVotesController,
    RedditcommunityUserCommunitiesCommentsVotesController,
    RedditcommunityModeratorCommunitiesCommentsVotesController,
    RedditcommunityAdminCommunitiesCommentsVotesController,
    RedditcommunityUserCommunitiesSubscriptionsController,
    RedditcommunityUserUsersProfilesController,
    RedditcommunityUserUsersCommentsController,
    RedditcommunityUserUsersPostsController,
    RedditcommunityUserUsersKarmaController,
    RedditcommunityModeratorContent_reportsController,
    RedditcommunityAdminContent_reportsController,
    RedditcommunityUserContent_reportsController,
    RedditcommunityModeratorModeratorsActionsController,
    RedditcommunityAdminRedditcommunitysystemconfigurationsController,
    RedditcommunityModeratorRedditcommunitysystemconfigurationsController,
    RedditcommunityRedditcommunitycontenttypesController,
    RedditcommunityAdminRedditcommunitycontenttypesController,
    RedditcommunityRedditcommunityreportreasonsController,
    RedditcommunityAdminRedditcommunityreportreasonsController,
  ],
})
export class MyModule {}
