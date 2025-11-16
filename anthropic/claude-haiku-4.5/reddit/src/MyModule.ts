import { Module } from "@nestjs/common";

import { AuthGuestController } from "./controllers/auth/guest/AuthGuestController";
import { AuthMemberController } from "./controllers/auth/member/AuthMemberController";
import { AuthModeratorController } from "./controllers/auth/moderator/AuthModeratorController";
import { AuthAdministratorController } from "./controllers/auth/administrator/AuthAdministratorController";
import { CommunityplatformMemberAuthMemberController } from "./controllers/communityPlatform/member/auth/member/logout/CommunityplatformMemberAuthMemberController";
import { CommunityplatformAuthMemberPassword_resetRequestController } from "./controllers/communityPlatform/auth/member/password-reset/request/CommunityplatformAuthMemberPassword_resetRequestController";
import { CommunityplatformAuthMemberPassword_resetConfirmController } from "./controllers/communityPlatform/auth/member/password-reset/confirm/CommunityplatformAuthMemberPassword_resetConfirmController";
import { CommunityplatformMemberAuthMemberPassword_changeController } from "./controllers/communityPlatform/member/auth/member/password-change/CommunityplatformMemberAuthMemberPassword_changeController";
import { CommunityplatformAuthMemberEmail_verifySendController } from "./controllers/communityPlatform/auth/member/email-verify/send/CommunityplatformAuthMemberEmail_verifySendController";
import { CommunityplatformAuthMemberEmail_verifyConfirmController } from "./controllers/communityPlatform/auth/member/email-verify/confirm/CommunityplatformAuthMemberEmail_verifyConfirmController";
import { CommunityplatformMemberAuthMemberEmail_changeRequestController } from "./controllers/communityPlatform/member/auth/member/email-change/request/CommunityplatformMemberAuthMemberEmail_changeRequestController";
import { CommunityplatformMemberAuthMemberEmail_changeConfirmController } from "./controllers/communityPlatform/member/auth/member/email-change/confirm/CommunityplatformMemberAuthMemberEmail_changeConfirmController";
import { CommunityplatformMemberAuthMemberSessionsController } from "./controllers/communityPlatform/member/auth/member/sessions/CommunityplatformMemberAuthMemberSessionsController";
import { CommunityplatformMemberAuthMemberSessionsLogout_allController } from "./controllers/communityPlatform/member/auth/member/sessions/logout-all/CommunityplatformMemberAuthMemberSessionsLogout_allController";
import { CommunityplatformModeratorAuthModeratorController } from "./controllers/communityPlatform/moderator/auth/moderator/logout/CommunityplatformModeratorAuthModeratorController";
import { CommunityplatformAuthModeratorPassword_resetRequestController } from "./controllers/communityPlatform/auth/moderator/password-reset/request/CommunityplatformAuthModeratorPassword_resetRequestController";
import { CommunityplatformAuthModeratorPassword_resetConfirmController } from "./controllers/communityPlatform/auth/moderator/password-reset/confirm/CommunityplatformAuthModeratorPassword_resetConfirmController";
import { CommunityplatformModeratorAuthModeratorPassword_changeController } from "./controllers/communityPlatform/moderator/auth/moderator/password-change/CommunityplatformModeratorAuthModeratorPassword_changeController";
import { CommunityplatformAuthModeratorEmail_verifySendController } from "./controllers/communityPlatform/auth/moderator/email-verify/send/CommunityplatformAuthModeratorEmail_verifySendController";
import { CommunityplatformAuthModeratorEmail_verifyController } from "./controllers/communityPlatform/auth/moderator/email-verify/confirm/CommunityplatformAuthModeratorEmail_verifyController";
import { CommunityplatformModeratorAuthModeratorEmail_changeRequestController } from "./controllers/communityPlatform/moderator/auth/moderator/email-change/request/CommunityplatformModeratorAuthModeratorEmail_changeRequestController";
import { CommunityplatformModeratorAuthModeratorEmail_changeConfirmController } from "./controllers/communityPlatform/moderator/auth/moderator/email-change/confirm/CommunityplatformModeratorAuthModeratorEmail_changeConfirmController";
import { CommunityplatformModeratorAuthModeratorSessionsController } from "./controllers/communityPlatform/moderator/auth/moderator/sessions/CommunityplatformModeratorAuthModeratorSessionsController";
import { CommunityplatformModeratorAuthModeratorSessionsLogout_allController } from "./controllers/communityPlatform/moderator/auth/moderator/sessions/logout-all/CommunityplatformModeratorAuthModeratorSessionsLogout_allController";
import { CommunityplatformAdministratorAuthAdministratorController } from "./controllers/communityPlatform/administrator/auth/administrator/logout/CommunityplatformAdministratorAuthAdministratorController";
import { CommunityplatformAuthAdministratorPassword_resetRequestController } from "./controllers/communityPlatform/auth/administrator/password-reset/request/CommunityplatformAuthAdministratorPassword_resetRequestController";
import { CommunityplatformAuthAdministratorPassword_resetConfirmController } from "./controllers/communityPlatform/auth/administrator/password-reset/confirm/CommunityplatformAuthAdministratorPassword_resetConfirmController";
import { CommunityplatformAdministratorAuthAdministratorPassword_changeController } from "./controllers/communityPlatform/administrator/auth/administrator/password-change/CommunityplatformAdministratorAuthAdministratorPassword_changeController";
import { CommunityplatformAuthAdministratorPassword_changeController } from "./controllers/communityPlatform/auth/administrator/password-change/CommunityplatformAuthAdministratorPassword_changeController";
import { CommunityplatformAdministratorAuthAdministratorEmail_verifySendController } from "./controllers/communityPlatform/administrator/auth/administrator/email-verify/send/CommunityplatformAdministratorAuthAdministratorEmail_verifySendController";
import { CommunityplatformAdministratorAuthAdministratorEmail_verifyConfirmController } from "./controllers/communityPlatform/administrator/auth/administrator/email-verify/confirm/CommunityplatformAdministratorAuthAdministratorEmail_verifyConfirmController";
import { CommunityplatformAdministratorAuthAdministratorEmail_changeRequestController } from "./controllers/communityPlatform/administrator/auth/administrator/email-change/request/CommunityplatformAdministratorAuthAdministratorEmail_changeRequestController";
import { CommunityplatformAdministratorAuthAdministratorEmail_changeConfirmController } from "./controllers/communityPlatform/administrator/auth/administrator/email-change/confirm/CommunityplatformAdministratorAuthAdministratorEmail_changeConfirmController";
import { CommunityplatformAdministratorAuthAdministratorSessionsController } from "./controllers/communityPlatform/administrator/auth/administrator/sessions/CommunityplatformAdministratorAuthAdministratorSessionsController";
import { CommunityplatformAdministratorAuthAdministratorSessionsLogout_allController } from "./controllers/communityPlatform/administrator/auth/administrator/sessions/logout-all/CommunityplatformAdministratorAuthAdministratorSessionsLogout_allController";
import { CommunityplatformCommunitiesController } from "./controllers/communityPlatform/communities/CommunityplatformCommunitiesController";
import { CommunityplatformMemberCommunitiesController } from "./controllers/communityPlatform/member/communities/CommunityplatformMemberCommunitiesController";
import { CommunityplatformModeratorCommunitiesController } from "./controllers/communityPlatform/moderator/communities/CommunityplatformModeratorCommunitiesController";
import { CommunityplatformAdministratorCommunitiesController } from "./controllers/communityPlatform/administrator/communities/CommunityplatformAdministratorCommunitiesController";
import { CommunityplatformCommunitiesSettingsController } from "./controllers/communityPlatform/communities/settings/CommunityplatformCommunitiesSettingsController";
import { CommunityplatformMemberCommunitiesSettingsController } from "./controllers/communityPlatform/member/communities/settings/CommunityplatformMemberCommunitiesSettingsController";
import { CommunityplatformCommunitiesRulesController } from "./controllers/communityPlatform/communities/rules/CommunityplatformCommunitiesRulesController";
import { CommunityplatformModeratorCommunitiesRulesController } from "./controllers/communityPlatform/moderator/communities/rules/CommunityplatformModeratorCommunitiesRulesController";
import { CommunityplatformMemberCommunitiesRulesController } from "./controllers/communityPlatform/member/communities/rules/CommunityplatformMemberCommunitiesRulesController";
import { CommunityplatformAdministratorCommunitiesRulesController } from "./controllers/communityPlatform/administrator/communities/rules/CommunityplatformAdministratorCommunitiesRulesController";
import { CommunityplatformMemberCommunitiesSubscriptionsController } from "./controllers/communityPlatform/member/communities/subscriptions/CommunityplatformMemberCommunitiesSubscriptionsController";
import { CommunityplatformModeratorCommunitiesSubscriptionsController } from "./controllers/communityPlatform/moderator/communities/subscriptions/CommunityplatformModeratorCommunitiesSubscriptionsController";
import { CommunityplatformAdministratorCommunitiesSubscriptionsController } from "./controllers/communityPlatform/administrator/communities/subscriptions/CommunityplatformAdministratorCommunitiesSubscriptionsController";
import { CommunityplatformModeratorCommunitiesBansController } from "./controllers/communityPlatform/moderator/communities/bans/CommunityplatformModeratorCommunitiesBansController";
import { CommunityplatformMemberCommunitiesModeratorsController } from "./controllers/communityPlatform/member/communities/moderators/CommunityplatformMemberCommunitiesModeratorsController";
import { CommunityplatformModeratorCommunitiesModeratorsController } from "./controllers/communityPlatform/moderator/communities/moderators/CommunityplatformModeratorCommunitiesModeratorsController";
import { CommunityplatformAdministratorCommunitiesModeratorsController } from "./controllers/communityPlatform/administrator/communities/moderators/CommunityplatformAdministratorCommunitiesModeratorsController";
import { CommunityplatformCategoriesController } from "./controllers/communityPlatform/categories/CommunityplatformCategoriesController";
import { CommunityplatformAdministratorCategoriesController } from "./controllers/communityPlatform/administrator/categories/CommunityplatformAdministratorCategoriesController";
import { CommunityplatformPostsController } from "./controllers/communityPlatform/posts/CommunityplatformPostsController";
import { CommunityplatformMemberPostsController } from "./controllers/communityPlatform/member/posts/CommunityplatformMemberPostsController";
import { CommunityplatformMemberPostsImagesController } from "./controllers/communityPlatform/member/posts/images/CommunityplatformMemberPostsImagesController";
import { CommunityplatformCommunitiesPostsController } from "./controllers/communityPlatform/communities/posts/CommunityplatformCommunitiesPostsController";
import { CommunityplatformCommentsController } from "./controllers/communityPlatform/comments/CommunityplatformCommentsController";
import { CommunityplatformMemberCommentsController } from "./controllers/communityPlatform/member/comments/CommunityplatformMemberCommentsController";
import { CommunityplatformPostsCommentsController } from "./controllers/communityPlatform/posts/comments/CommunityplatformPostsCommentsController";
import { CommunityplatformMemberPostsCommentsController } from "./controllers/communityPlatform/member/posts/comments/CommunityplatformMemberPostsCommentsController";
import { CommunityplatformCommentsCommentsController } from "./controllers/communityPlatform/comments/comments/CommunityplatformCommentsCommentsController";
import { CommunityplatformMemberCommentsCommentsController } from "./controllers/communityPlatform/member/comments/comments/CommunityplatformMemberCommentsCommentsController";
import { CommunityplatformMemberVotesController } from "./controllers/communityPlatform/member/votes/CommunityplatformMemberVotesController";
import { CommunityplatformModeratorVotesController } from "./controllers/communityPlatform/moderator/votes/CommunityplatformModeratorVotesController";
import { CommunityplatformAdministratorVotesController } from "./controllers/communityPlatform/administrator/votes/CommunityplatformAdministratorVotesController";
import { CommunityplatformPostsVotesController } from "./controllers/communityPlatform/posts/votes/CommunityplatformPostsVotesController";
import { CommunityplatformMemberPostsVotesController } from "./controllers/communityPlatform/member/posts/votes/CommunityplatformMemberPostsVotesController";
import { CommunityplatformMemberCommentsVotesController } from "./controllers/communityPlatform/member/comments/votes/CommunityplatformMemberCommentsVotesController";
import { CommunityplatformAdministratorKarmascoresController } from "./controllers/communityPlatform/administrator/karmaScores/CommunityplatformAdministratorKarmascoresController";
import { CommunityplatformModeratorKarmascoresController } from "./controllers/communityPlatform/moderator/karmaScores/CommunityplatformModeratorKarmascoresController";
import { CommunityplatformMemberMembersKarmascoresController } from "./controllers/communityPlatform/member/members/karmaScores/CommunityplatformMemberMembersKarmascoresController";
import { MyKarmascoresController } from "./controllers/my/karmaScores/MyKarmascoresController";
import { CommunityplatformMemberKarmahistoryController } from "./controllers/communityPlatform/member/karmaHistory/CommunityplatformMemberKarmahistoryController";
import { CommunityplatformModeratorKarmahistoryController } from "./controllers/communityPlatform/moderator/karmaHistory/CommunityplatformModeratorKarmahistoryController";
import { CommunityplatformAdministratorKarmahistoryController } from "./controllers/communityPlatform/administrator/karmaHistory/CommunityplatformAdministratorKarmahistoryController";
import { CommunityplatformMemberMembersKarmahistoryController } from "./controllers/communityPlatform/member/members/karmaHistory/CommunityplatformMemberMembersKarmahistoryController";
import { CommunityplatformModeratorMembersKarmahistoryController } from "./controllers/communityPlatform/moderator/members/karmaHistory/CommunityplatformModeratorMembersKarmahistoryController";
import { CommunityplatformAdministratorMembersKarmahistoryController } from "./controllers/communityPlatform/administrator/members/karmaHistory/CommunityplatformAdministratorMembersKarmahistoryController";
import { CommunityplatformModeratorReportsController } from "./controllers/communityPlatform/moderator/reports/CommunityplatformModeratorReportsController";
import { CommunityplatformAdministratorReportsController } from "./controllers/communityPlatform/administrator/reports/CommunityplatformAdministratorReportsController";
import { CommunityplatformMemberReportsController } from "./controllers/communityPlatform/member/reports/CommunityplatformMemberReportsController";
import { CommunityplatformReportsDecisionController } from "./controllers/communityPlatform/reports/decision/CommunityplatformReportsDecisionController";
import { CommunityplatformModeratorReportsDecisionController } from "./controllers/communityPlatform/moderator/reports/decision/CommunityplatformModeratorReportsDecisionController";
import { CommunityplatformModeratorMemberwarningsController } from "./controllers/communityPlatform/moderator/memberWarnings/CommunityplatformModeratorMemberwarningsController";
import { CommunityplatformAdministratorMemberwarningsController } from "./controllers/communityPlatform/administrator/memberWarnings/CommunityplatformAdministratorMemberwarningsController";
import { CommunityplatformMemberMemberwarningsController } from "./controllers/communityPlatform/member/memberWarnings/CommunityplatformMemberMemberwarningsController";
import { CommunityplatformModeratorMembersuspensionsController } from "./controllers/communityPlatform/moderator/memberSuspensions/CommunityplatformModeratorMembersuspensionsController";
import { CommunityplatformAdministratorMembersuspensionsController } from "./controllers/communityPlatform/administrator/memberSuspensions/CommunityplatformAdministratorMembersuspensionsController";
import { CommunityplatformMemberMembersuspensionsController } from "./controllers/communityPlatform/member/memberSuspensions/CommunityplatformMemberMembersuspensionsController";
import { CommunityplatformModeratorMemberbansController } from "./controllers/communityPlatform/moderator/memberBans/CommunityplatformModeratorMemberbansController";
import { CommunityplatformAdministratorMemberbansController } from "./controllers/communityPlatform/administrator/memberBans/CommunityplatformAdministratorMemberbansController";
import { CommunityplatformModeratorModerationappealsController } from "./controllers/communityPlatform/moderator/moderationAppeals/CommunityplatformModeratorModerationappealsController";
import { CommunityplatformMemberModerationappealsController } from "./controllers/communityPlatform/member/moderationAppeals/CommunityplatformMemberModerationappealsController";
import { CommunityplatformAdministratorModerationappealsController } from "./controllers/communityPlatform/administrator/moderationAppeals/CommunityplatformAdministratorModerationappealsController";
import { CommunityplatformModerationappealsController } from "./controllers/communityPlatform/moderationAppeals/CommunityplatformModerationappealsController";
import { CommunityplatformAdministratorModerationauditlogsController } from "./controllers/communityPlatform/administrator/moderationAuditLogs/CommunityplatformAdministratorModerationauditlogsController";
import { CommunityplatformModeratorModerationauditlogsController } from "./controllers/communityPlatform/moderator/moderationAuditLogs/CommunityplatformModeratorModerationauditlogsController";
import { CommunityplatformMembersProfilesController } from "./controllers/communityPlatform/members/profiles/CommunityplatformMembersProfilesController";
import { CommunityplatformMemberMembersProfilesController } from "./controllers/communityPlatform/member/members/profiles/CommunityplatformMemberMembersProfilesController";
import { CommunityplatformMemberMembersPreferencesController } from "./controllers/communityPlatform/member/members/preferences/CommunityplatformMemberMembersPreferencesController";
import { CommunityplatformMembersActivityController } from "./controllers/communityPlatform/members/activity/CommunityplatformMembersActivityController";
import { CommunityplatformMembersFollowingController } from "./controllers/communityPlatform/members/following/CommunityplatformMembersFollowingController";
import { CommunityplatformMemberMembersFollowingController } from "./controllers/communityPlatform/member/members/following/CommunityplatformMemberMembersFollowingController";
import { CommunityplatformMembersFollowersController } from "./controllers/communityPlatform/members/followers/CommunityplatformMembersFollowersController";
import { CommunityplatformMemberMembersSavedController } from "./controllers/communityPlatform/member/members/saved/CommunityplatformMemberMembersSavedController";
import { CommunityplatformSearchController } from "./controllers/communityPlatform/search/CommunityplatformSearchController";
import { CommunityplatformTrendingPostsController } from "./controllers/communityPlatform/trending/posts/CommunityplatformTrendingPostsController";
import { CommunityplatformTrendingCommunitiesController } from "./controllers/communityPlatform/trending/communities/CommunityplatformTrendingCommunitiesController";
import { CommunityplatformTrendingTopicsController } from "./controllers/communityPlatform/trending/topics/CommunityplatformTrendingTopicsController";
import { CommunityplatformMemberDiscoverController } from "./controllers/communityPlatform/member/discover/CommunityplatformMemberDiscoverController";
import { CommunityplatformAdministratorConfigurationsController } from "./controllers/communityPlatform/administrator/configurations/CommunityplatformAdministratorConfigurationsController";

@Module({
  controllers: [
    AuthGuestController,
    AuthMemberController,
    AuthModeratorController,
    AuthAdministratorController,
    CommunityplatformMemberAuthMemberController,
    CommunityplatformAuthMemberPassword_resetRequestController,
    CommunityplatformAuthMemberPassword_resetConfirmController,
    CommunityplatformMemberAuthMemberPassword_changeController,
    CommunityplatformAuthMemberEmail_verifySendController,
    CommunityplatformAuthMemberEmail_verifyConfirmController,
    CommunityplatformMemberAuthMemberEmail_changeRequestController,
    CommunityplatformMemberAuthMemberEmail_changeConfirmController,
    CommunityplatformMemberAuthMemberSessionsController,
    CommunityplatformMemberAuthMemberSessionsLogout_allController,
    CommunityplatformModeratorAuthModeratorController,
    CommunityplatformAuthModeratorPassword_resetRequestController,
    CommunityplatformAuthModeratorPassword_resetConfirmController,
    CommunityplatformModeratorAuthModeratorPassword_changeController,
    CommunityplatformAuthModeratorEmail_verifySendController,
    CommunityplatformAuthModeratorEmail_verifyController,
    CommunityplatformModeratorAuthModeratorEmail_changeRequestController,
    CommunityplatformModeratorAuthModeratorEmail_changeConfirmController,
    CommunityplatformModeratorAuthModeratorSessionsController,
    CommunityplatformModeratorAuthModeratorSessionsLogout_allController,
    CommunityplatformAdministratorAuthAdministratorController,
    CommunityplatformAuthAdministratorPassword_resetRequestController,
    CommunityplatformAuthAdministratorPassword_resetConfirmController,
    CommunityplatformAdministratorAuthAdministratorPassword_changeController,
    CommunityplatformAuthAdministratorPassword_changeController,
    CommunityplatformAdministratorAuthAdministratorEmail_verifySendController,
    CommunityplatformAdministratorAuthAdministratorEmail_verifyConfirmController,
    CommunityplatformAdministratorAuthAdministratorEmail_changeRequestController,
    CommunityplatformAdministratorAuthAdministratorEmail_changeConfirmController,
    CommunityplatformAdministratorAuthAdministratorSessionsController,
    CommunityplatformAdministratorAuthAdministratorSessionsLogout_allController,
    CommunityplatformCommunitiesController,
    CommunityplatformMemberCommunitiesController,
    CommunityplatformModeratorCommunitiesController,
    CommunityplatformAdministratorCommunitiesController,
    CommunityplatformCommunitiesSettingsController,
    CommunityplatformMemberCommunitiesSettingsController,
    CommunityplatformCommunitiesRulesController,
    CommunityplatformModeratorCommunitiesRulesController,
    CommunityplatformMemberCommunitiesRulesController,
    CommunityplatformAdministratorCommunitiesRulesController,
    CommunityplatformMemberCommunitiesSubscriptionsController,
    CommunityplatformModeratorCommunitiesSubscriptionsController,
    CommunityplatformAdministratorCommunitiesSubscriptionsController,
    CommunityplatformModeratorCommunitiesBansController,
    CommunityplatformMemberCommunitiesModeratorsController,
    CommunityplatformModeratorCommunitiesModeratorsController,
    CommunityplatformAdministratorCommunitiesModeratorsController,
    CommunityplatformCategoriesController,
    CommunityplatformAdministratorCategoriesController,
    CommunityplatformPostsController,
    CommunityplatformMemberPostsController,
    CommunityplatformMemberPostsImagesController,
    CommunityplatformCommunitiesPostsController,
    CommunityplatformCommentsController,
    CommunityplatformMemberCommentsController,
    CommunityplatformPostsCommentsController,
    CommunityplatformMemberPostsCommentsController,
    CommunityplatformCommentsCommentsController,
    CommunityplatformMemberCommentsCommentsController,
    CommunityplatformMemberVotesController,
    CommunityplatformModeratorVotesController,
    CommunityplatformAdministratorVotesController,
    CommunityplatformPostsVotesController,
    CommunityplatformMemberPostsVotesController,
    CommunityplatformMemberCommentsVotesController,
    CommunityplatformAdministratorKarmascoresController,
    CommunityplatformModeratorKarmascoresController,
    CommunityplatformMemberMembersKarmascoresController,
    MyKarmascoresController,
    CommunityplatformMemberKarmahistoryController,
    CommunityplatformModeratorKarmahistoryController,
    CommunityplatformAdministratorKarmahistoryController,
    CommunityplatformMemberMembersKarmahistoryController,
    CommunityplatformModeratorMembersKarmahistoryController,
    CommunityplatformAdministratorMembersKarmahistoryController,
    CommunityplatformModeratorReportsController,
    CommunityplatformAdministratorReportsController,
    CommunityplatformMemberReportsController,
    CommunityplatformReportsDecisionController,
    CommunityplatformModeratorReportsDecisionController,
    CommunityplatformModeratorMemberwarningsController,
    CommunityplatformAdministratorMemberwarningsController,
    CommunityplatformMemberMemberwarningsController,
    CommunityplatformModeratorMembersuspensionsController,
    CommunityplatformAdministratorMembersuspensionsController,
    CommunityplatformMemberMembersuspensionsController,
    CommunityplatformModeratorMemberbansController,
    CommunityplatformAdministratorMemberbansController,
    CommunityplatformModeratorModerationappealsController,
    CommunityplatformMemberModerationappealsController,
    CommunityplatformAdministratorModerationappealsController,
    CommunityplatformModerationappealsController,
    CommunityplatformAdministratorModerationauditlogsController,
    CommunityplatformModeratorModerationauditlogsController,
    CommunityplatformMembersProfilesController,
    CommunityplatformMemberMembersProfilesController,
    CommunityplatformMemberMembersPreferencesController,
    CommunityplatformMembersActivityController,
    CommunityplatformMembersFollowingController,
    CommunityplatformMemberMembersFollowingController,
    CommunityplatformMembersFollowersController,
    CommunityplatformMemberMembersSavedController,
    CommunityplatformSearchController,
    CommunityplatformTrendingPostsController,
    CommunityplatformTrendingCommunitiesController,
    CommunityplatformTrendingTopicsController,
    CommunityplatformMemberDiscoverController,
    CommunityplatformAdministratorConfigurationsController,
  ],
})
export class MyModule {}
