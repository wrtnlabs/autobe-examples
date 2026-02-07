import { Module } from "@nestjs/common";

import { DiscussionboardAdminAdminBanned_usersController } from "./controllers/discussionBoard/admin/admin/banned-users/DiscussionboardAdminAdminBanned_usersController";
import { DiscussionboardAdminAdminSessionsController } from "./controllers/discussionBoard/admin/admin/sessions/DiscussionboardAdminAdminSessionsController";
import { DiscussionboardAdminAdminsBansController } from "./controllers/discussionBoard/admin/admins/bans/DiscussionboardAdminAdminsBansController";
import { DiscussionboardAdminAdminsBansAppealsController } from "./controllers/discussionBoard/admin/admins/bans/appeals/DiscussionboardAdminAdminsBansAppealsController";
import { DiscussionboardAdminAnalyticsCommentsController } from "./controllers/discussionBoard/admin/analytics/comments/DiscussionboardAdminAnalyticsCommentsController";
import { DiscussionboardAdminArticlesController } from "./controllers/discussionBoard/admin/articles/DiscussionboardAdminArticlesController";
import { DiscussionboardAdminArticlesBulkController } from "./controllers/discussionBoard/admin/articles/bulk/archive/DiscussionboardAdminArticlesBulkController";
import { DiscussionboardAdminArticlesCommentsController } from "./controllers/discussionBoard/admin/articles/comments/DiscussionboardAdminArticlesCommentsController";
import { DiscussionboardAdminArticlesFilesController } from "./controllers/discussionBoard/admin/articles/files/DiscussionboardAdminArticlesFilesController";
import { DiscussionboardAdminArticlesImagesController } from "./controllers/discussionBoard/admin/articles/images/DiscussionboardAdminArticlesImagesController";
import { DiscussionboardAdminArticlesTagsController } from "./controllers/discussionBoard/admin/articles/tags/DiscussionboardAdminArticlesTagsController";
import { DiscussionboardAdminBansController } from "./controllers/discussionBoard/admin/bans/DiscussionboardAdminBansController";
import { DiscussionboardAdminBansAdmin_logsController } from "./controllers/discussionBoard/admin/bans/admin-logs/DiscussionboardAdminBansAdmin_logsController";
import { DiscussionboardAdminBansAppealsController } from "./controllers/discussionBoard/admin/bans/appeals/DiscussionboardAdminBansAppealsController";
import { DiscussionboardAdminCommentsController } from "./controllers/discussionBoard/admin/comments/DiscussionboardAdminCommentsController";
import { DiscussionboardAdminConfig_historyController } from "./controllers/discussionBoard/admin/config-history/DiscussionboardAdminConfig_historyController";
import { DiscussionboardAdminDeletedCommentsController } from "./controllers/discussionBoard/admin/deleted/comments/DiscussionboardAdminDeletedCommentsController";
import { DiscussionboardAdminLogsController } from "./controllers/discussionBoard/admin/logs/DiscussionboardAdminLogsController";
import { DiscussionboardAdminModerationFlagsController } from "./controllers/discussionBoard/admin/moderation/flags/DiscussionboardAdminModerationFlagsController";
import { DiscussionboardAdminModerationQueueController } from "./controllers/discussionBoard/admin/moderation/queue/DiscussionboardAdminModerationQueueController";
import { DiscussionboardAdminRecommendationsController } from "./controllers/discussionBoard/admin/recommendations/DiscussionboardAdminRecommendationsController";
import { DiscussionboardAdminRequestsController } from "./controllers/discussionBoard/admin/requests/DiscussionboardAdminRequestsController";
import { DiscussionboardAdminSectionsController } from "./controllers/discussionBoard/admin/sections/DiscussionboardAdminSectionsController";
import { DiscussionboardAdminSectionsArticlesController } from "./controllers/discussionBoard/admin/sections/articles/DiscussionboardAdminSectionsArticlesController";
import { DiscussionboardAdminSettingsController } from "./controllers/discussionBoard/admin/settings/DiscussionboardAdminSettingsController";
import { DiscussionboardAdminTagsController } from "./controllers/discussionBoard/admin/tags/DiscussionboardAdminTagsController";
import { DiscussionboardAdminUsersBansController } from "./controllers/discussionBoard/admin/users/bans/DiscussionboardAdminUsersBansController";
import { DiscussionboardAuthAdminController } from "./controllers/discussionBoard/auth/admin/DiscussionboardAuthAdminController";
import { DiscussionboardAuthGuestController } from "./controllers/discussionBoard/auth/guest/DiscussionboardAuthGuestController";
import { DiscussionboardAuthMemberController } from "./controllers/discussionBoard/auth/member/DiscussionboardAuthMemberController";
import { DiscussionboardAuthSuper_adminController } from "./controllers/discussionBoard/auth/super-admin/DiscussionboardAuthSuper_adminController";
import { DiscussionboardGuestArticlesController } from "./controllers/discussionBoard/guest/articles/DiscussionboardGuestArticlesController";
import { DiscussionboardGuestArticlesFilesController } from "./controllers/discussionBoard/guest/articles/files/DiscussionboardGuestArticlesFilesController";
import { DiscussionboardGuestArticlesImagesController } from "./controllers/discussionBoard/guest/articles/images/DiscussionboardGuestArticlesImagesController";
import { DiscussionboardGuestArticlesTrendingController } from "./controllers/discussionBoard/guest/articles/trending/DiscussionboardGuestArticlesTrendingController";
import { DiscussionboardGuestSearchArticlesController } from "./controllers/discussionBoard/guest/search/articles/DiscussionboardGuestSearchArticlesController";
import { DiscussionboardGuestSectionsArticlesController } from "./controllers/discussionBoard/guest/sections/articles/DiscussionboardGuestSectionsArticlesController";
import { DiscussionboardGuestTagsController } from "./controllers/discussionBoard/guest/tags/DiscussionboardGuestTagsController";
import { DiscussionboardMemberAdminRequestsController } from "./controllers/discussionBoard/member/admin/requests/DiscussionboardMemberAdminRequestsController";
import { DiscussionboardMemberArticlesController } from "./controllers/discussionBoard/member/articles/DiscussionboardMemberArticlesController";
import { DiscussionboardMemberArticlesAnalyticsController } from "./controllers/discussionBoard/member/articles/analytics/DiscussionboardMemberArticlesAnalyticsController";
import { DiscussionboardMemberArticlesCommentsController } from "./controllers/discussionBoard/member/articles/comments/DiscussionboardMemberArticlesCommentsController";
import { DiscussionboardMemberArticlesFilesController } from "./controllers/discussionBoard/member/articles/files/DiscussionboardMemberArticlesFilesController";
import { DiscussionboardMemberArticlesImagesController } from "./controllers/discussionBoard/member/articles/images/DiscussionboardMemberArticlesImagesController";
import { DiscussionboardMemberArticlesTagsController } from "./controllers/discussionBoard/member/articles/tags/DiscussionboardMemberArticlesTagsController";
import { DiscussionboardMemberArticlesTrendingController } from "./controllers/discussionBoard/member/articles/trending/DiscussionboardMemberArticlesTrendingController";
import { DiscussionboardMemberBansAppealsController } from "./controllers/discussionBoard/member/bans/appeals/DiscussionboardMemberBansAppealsController";
import { DiscussionboardMemberCommentsController } from "./controllers/discussionBoard/member/comments/DiscussionboardMemberCommentsController";
import { DiscussionboardMemberEmail_verificationsController } from "./controllers/discussionBoard/member/email-verifications/DiscussionboardMemberEmail_verificationsController";
import { DiscussionboardMemberMembersMeBansController } from "./controllers/discussionBoard/member/members/me/bans/DiscussionboardMemberMembersMeBansController";
import { DiscussionboardMemberPassword_resetsController } from "./controllers/discussionBoard/member/password-resets/DiscussionboardMemberPassword_resetsController";
import { DiscussionboardMemberProfileController } from "./controllers/discussionBoard/member/profile/DiscussionboardMemberProfileController";
import { DiscussionboardMemberRecommendationsController } from "./controllers/discussionBoard/member/recommendations/DiscussionboardMemberRecommendationsController";
import { DiscussionboardMemberSearchArticlesController } from "./controllers/discussionBoard/member/search/articles/DiscussionboardMemberSearchArticlesController";
import { DiscussionboardMemberSectionsArticlesController } from "./controllers/discussionBoard/member/sections/articles/DiscussionboardMemberSectionsArticlesController";
import { DiscussionboardMemberTagsController } from "./controllers/discussionBoard/member/tags/DiscussionboardMemberTagsController";
import { DiscussionboardMemberTagsSuggestionsController } from "./controllers/discussionBoard/member/tags/suggestions/DiscussionboardMemberTagsSuggestionsController";
import { DiscussionboardMembersController } from "./controllers/discussionBoard/members/DiscussionboardMembersController";
import { DiscussionboardSearchController } from "./controllers/discussionBoard/search/DiscussionboardSearchController";
import { DiscussionboardSearchBehaviorController } from "./controllers/discussionBoard/search/behavior/DiscussionboardSearchBehaviorController";
import { DiscussionboardSearchClicksController } from "./controllers/discussionBoard/search/clicks/DiscussionboardSearchClicksController";
import { DiscussionboardSearchIndicesController } from "./controllers/discussionBoard/search/indices/DiscussionboardSearchIndicesController";
import { DiscussionboardSearchQueriesController } from "./controllers/discussionBoard/search/queries/DiscussionboardSearchQueriesController";
import { DiscussionboardSearchQueriesStatisticsController } from "./controllers/discussionBoard/search/queries/statistics/DiscussionboardSearchQueriesStatisticsController";
import { DiscussionboardSearchResultsController } from "./controllers/discussionBoard/search/results/DiscussionboardSearchResultsController";
import { DiscussionboardSectionsController } from "./controllers/discussionBoard/sections/DiscussionboardSectionsController";
import { DiscussionboardSuperadminAdminBanned_usersController } from "./controllers/discussionBoard/superAdmin/admin/banned-users/DiscussionboardSuperadminAdminBanned_usersController";
import { DiscussionboardSuperadminAdminRequestsController } from "./controllers/discussionBoard/superAdmin/admin/requests/DiscussionboardSuperadminAdminRequestsController";
import { DiscussionboardSuperadminAdminRolesController } from "./controllers/discussionBoard/superAdmin/admin/roles/DiscussionboardSuperadminAdminRolesController";
import { DiscussionboardSuperadminAdminRolesDemote_superController } from "./controllers/discussionBoard/superAdmin/admin/roles/demote-super/DiscussionboardSuperadminAdminRolesDemote_superController";
import { DiscussionboardSuperadminAdminRolesPromote_superController } from "./controllers/discussionBoard/superAdmin/admin/roles/promote-super/DiscussionboardSuperadminAdminRolesPromote_superController";
import { DiscussionboardSuperadminAdminsBansController } from "./controllers/discussionBoard/superAdmin/admins/bans/DiscussionboardSuperadminAdminsBansController";
import { DiscussionboardSuperadminAdminsBansAppealsController } from "./controllers/discussionBoard/superAdmin/admins/bans/appeals/DiscussionboardSuperadminAdminsBansAppealsController";
import { DiscussionboardSuperadminAnalyticsCommentsController } from "./controllers/discussionBoard/superAdmin/analytics/comments/DiscussionboardSuperadminAnalyticsCommentsController";
import { DiscussionboardSuperadminArticlesController } from "./controllers/discussionBoard/superAdmin/articles/DiscussionboardSuperadminArticlesController";
import { DiscussionboardSuperadminArticlesCommentsController } from "./controllers/discussionBoard/superAdmin/articles/comments/DiscussionboardSuperadminArticlesCommentsController";
import { DiscussionboardSuperadminArticlesFilesController } from "./controllers/discussionBoard/superAdmin/articles/files/DiscussionboardSuperadminArticlesFilesController";
import { DiscussionboardSuperadminArticlesImagesController } from "./controllers/discussionBoard/superAdmin/articles/images/DiscussionboardSuperadminArticlesImagesController";
import { DiscussionboardSuperadminArticlesTagsController } from "./controllers/discussionBoard/superAdmin/articles/tags/DiscussionboardSuperadminArticlesTagsController";
import { DiscussionboardSuperadminBansAdmin_logsController } from "./controllers/discussionBoard/superAdmin/bans/admin-logs/DiscussionboardSuperadminBansAdmin_logsController";
import { DiscussionboardSuperadminCommentsController } from "./controllers/discussionBoard/superAdmin/comments/DiscussionboardSuperadminCommentsController";
import { DiscussionboardSuperadminConfig_historyController } from "./controllers/discussionBoard/superAdmin/config-history/DiscussionboardSuperadminConfig_historyController";
import { DiscussionboardSuperadminDeletedCommentsController } from "./controllers/discussionBoard/superAdmin/deleted/comments/DiscussionboardSuperadminDeletedCommentsController";
import { DiscussionboardSuperadminLogsController } from "./controllers/discussionBoard/superAdmin/logs/DiscussionboardSuperadminLogsController";
import { DiscussionboardSuperadminModerationFlagsController } from "./controllers/discussionBoard/superAdmin/moderation/flags/DiscussionboardSuperadminModerationFlagsController";
import { DiscussionboardSuperadminModerationQueueController } from "./controllers/discussionBoard/superAdmin/moderation/queue/DiscussionboardSuperadminModerationQueueController";
import { DiscussionboardSuperadminRecommendationsController } from "./controllers/discussionBoard/superAdmin/recommendations/DiscussionboardSuperadminRecommendationsController";
import { DiscussionboardSuperadminSectionsArticlesController } from "./controllers/discussionBoard/superAdmin/sections/articles/DiscussionboardSuperadminSectionsArticlesController";
import { DiscussionboardSuperadminSessionsController } from "./controllers/discussionBoard/superAdmin/sessions/DiscussionboardSuperadminSessionsController";
import { DiscussionboardSuperadminSettingsController } from "./controllers/discussionBoard/superAdmin/settings/DiscussionboardSuperadminSettingsController";
import { DiscussionboardSuperadminTagsController } from "./controllers/discussionBoard/superAdmin/tags/DiscussionboardSuperadminTagsController";
import { DiscussionboardSuperadminUsersBansController } from "./controllers/discussionBoard/superAdmin/users/bans/DiscussionboardSuperadminUsersBansController";

@Module({
  controllers: [
    DiscussionboardAuthMemberController,
    DiscussionboardAuthAdminController,
    DiscussionboardAuthSuper_adminController,
    DiscussionboardAuthGuestController,
    DiscussionboardMembersController,
    DiscussionboardMemberProfileController,
    DiscussionboardAdminAdminSessionsController,
    DiscussionboardMemberEmail_verificationsController,
    DiscussionboardMemberPassword_resetsController,
    DiscussionboardSuperadminSessionsController,
    DiscussionboardMemberSectionsArticlesController,
    DiscussionboardAdminSectionsArticlesController,
    DiscussionboardSuperadminSectionsArticlesController,
    DiscussionboardGuestSectionsArticlesController,
    DiscussionboardMemberArticlesController,
    DiscussionboardAdminArticlesController,
    DiscussionboardSuperadminArticlesController,
    DiscussionboardGuestArticlesController,
    DiscussionboardMemberArticlesFilesController,
    DiscussionboardAdminArticlesFilesController,
    DiscussionboardSuperadminArticlesFilesController,
    DiscussionboardGuestArticlesFilesController,
    DiscussionboardMemberArticlesImagesController,
    DiscussionboardAdminArticlesImagesController,
    DiscussionboardSuperadminArticlesImagesController,
    DiscussionboardGuestArticlesImagesController,
    DiscussionboardMemberTagsController,
    DiscussionboardAdminTagsController,
    DiscussionboardSuperadminTagsController,
    DiscussionboardGuestTagsController,
    DiscussionboardMemberArticlesTagsController,
    DiscussionboardAdminArticlesTagsController,
    DiscussionboardSuperadminArticlesTagsController,
    DiscussionboardMemberArticlesCommentsController,
    DiscussionboardAdminArticlesCommentsController,
    DiscussionboardSuperadminArticlesCommentsController,
    DiscussionboardMemberCommentsController,
    DiscussionboardAdminCommentsController,
    DiscussionboardSuperadminCommentsController,
    DiscussionboardAdminSectionsController,
    DiscussionboardSectionsController,
    DiscussionboardSearchIndicesController,
    DiscussionboardSearchQueriesController,
    DiscussionboardSearchResultsController,
    DiscussionboardSearchClicksController,
    DiscussionboardAdminBansController,
    DiscussionboardAdminBansAppealsController,
    DiscussionboardAdminBansAdmin_logsController,
    DiscussionboardAdminRequestsController,
    DiscussionboardMemberAdminRequestsController,
    DiscussionboardSuperadminAdminRequestsController,
    DiscussionboardSuperadminAdminRolesController,
    DiscussionboardAdminSettingsController,
    DiscussionboardSuperadminSettingsController,
    DiscussionboardAdminLogsController,
    DiscussionboardSuperadminLogsController,
    DiscussionboardAdminConfig_historyController,
    DiscussionboardSuperadminConfig_historyController,
    DiscussionboardMemberSearchArticlesController,
    DiscussionboardGuestSearchArticlesController,
    DiscussionboardMemberArticlesTrendingController,
    DiscussionboardGuestArticlesTrendingController,
    DiscussionboardMemberRecommendationsController,
    DiscussionboardAdminRecommendationsController,
    DiscussionboardSuperadminRecommendationsController,
    DiscussionboardMemberArticlesAnalyticsController,
    DiscussionboardAdminArticlesBulkController,
    DiscussionboardMemberTagsSuggestionsController,
    DiscussionboardAdminAnalyticsCommentsController,
    DiscussionboardSuperadminAnalyticsCommentsController,
    DiscussionboardAdminModerationFlagsController,
    DiscussionboardSuperadminModerationFlagsController,
    DiscussionboardAdminModerationQueueController,
    DiscussionboardSuperadminModerationQueueController,
    DiscussionboardAdminDeletedCommentsController,
    DiscussionboardSuperadminDeletedCommentsController,
    DiscussionboardSearchController,
    DiscussionboardSearchBehaviorController,
    DiscussionboardSearchQueriesStatisticsController,
    DiscussionboardAdminUsersBansController,
    DiscussionboardSuperadminUsersBansController,
    DiscussionboardMemberMembersMeBansController,
    DiscussionboardAdminAdminsBansController,
    DiscussionboardSuperadminAdminsBansController,
    DiscussionboardAdminAdminsBansAppealsController,
    DiscussionboardSuperadminAdminsBansAppealsController,
    DiscussionboardMemberBansAppealsController,
    DiscussionboardSuperadminBansAdmin_logsController,
    DiscussionboardSuperadminAdminRolesPromote_superController,
    DiscussionboardSuperadminAdminRolesDemote_superController,
    DiscussionboardAdminAdminBanned_usersController,
    DiscussionboardSuperadminAdminBanned_usersController,
  ],
})
export class MyModule {}
