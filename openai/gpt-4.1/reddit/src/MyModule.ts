import { Module } from "@nestjs/common";

import { AuthGuestController } from "./controllers/auth/guest/AuthGuestController";
import { AuthMemberController } from "./controllers/auth/member/AuthMemberController";
import { AuthModeratorController } from "./controllers/auth/moderator/AuthModeratorController";
import { AuthAdminController } from "./controllers/auth/admin/AuthAdminController";
import { CommunityplatformAdminSystemconfigsController } from "./controllers/communityPlatform/admin/systemConfigs/CommunityplatformAdminSystemconfigsController";
import { CommunityplatformAdminAuditlogsController } from "./controllers/communityPlatform/admin/auditLogs/CommunityplatformAdminAuditlogsController";
import { CommunityplatformAdminBannedwordsController } from "./controllers/communityPlatform/admin/bannedWords/CommunityplatformAdminBannedwordsController";
import { CommunityplatformAdminFileuploadsController } from "./controllers/communityPlatform/admin/fileUploads/CommunityplatformAdminFileuploadsController";
import { CommunityplatformMemberFileuploadsController } from "./controllers/communityPlatform/member/fileUploads/CommunityplatformMemberFileuploadsController";
import { CommunityplatformModeratorFileuploadsController } from "./controllers/communityPlatform/moderator/fileUploads/CommunityplatformModeratorFileuploadsController";
import { CommunityplatformAdminMembersController } from "./controllers/communityPlatform/admin/members/CommunityplatformAdminMembersController";
import { CommunityplatformModeratorMembersController } from "./controllers/communityPlatform/moderator/members/CommunityplatformModeratorMembersController";
import { CommunityplatformMembersController } from "./controllers/communityPlatform/members/CommunityplatformMembersController";
import { CommunityplatformMemberMembersController } from "./controllers/communityPlatform/member/members/CommunityplatformMemberMembersController";
import { CommunityplatformAdminModeratorsController } from "./controllers/communityPlatform/admin/moderators/CommunityplatformAdminModeratorsController";
import { CommunityplatformAdminAdminsController } from "./controllers/communityPlatform/admin/admins/CommunityplatformAdminAdminsController";
import { CommunityplatformCommunitiesController } from "./controllers/communityPlatform/communities/CommunityplatformCommunitiesController";
import { CommunityplatformMemberCommunitiesController } from "./controllers/communityPlatform/member/communities/CommunityplatformMemberCommunitiesController";
import { CommunityplatformAdminCommunitiesController } from "./controllers/communityPlatform/admin/communities/CommunityplatformAdminCommunitiesController";
import { CommunityplatformModeratorCommunitiesController } from "./controllers/communityPlatform/moderator/communities/CommunityplatformModeratorCommunitiesController";
import { CommunityplatformMemberCommunitiesRulesController } from "./controllers/communityPlatform/member/communities/rules/CommunityplatformMemberCommunitiesRulesController";
import { CommunityplatformModeratorCommunitiesRulesController } from "./controllers/communityPlatform/moderator/communities/rules/CommunityplatformModeratorCommunitiesRulesController";
import { CommunityplatformAdminCommunitiesRulesController } from "./controllers/communityPlatform/admin/communities/rules/CommunityplatformAdminCommunitiesRulesController";
import { CommunityplatformModeratorCommunitiesBannersController } from "./controllers/communityPlatform/moderator/communities/banners/CommunityplatformModeratorCommunitiesBannersController";
import { CommunityplatformAdminCommunitiesBannersController } from "./controllers/communityPlatform/admin/communities/banners/CommunityplatformAdminCommunitiesBannersController";
import { CommunityplatformCommunitiesBannersController } from "./controllers/communityPlatform/communities/banners/CommunityplatformCommunitiesBannersController";
import { CommunityplatformCommunitiesImagesController } from "./controllers/communityPlatform/communities/images/CommunityplatformCommunitiesImagesController";
import { CommunityplatformModeratorCommunitiesImagesController } from "./controllers/communityPlatform/moderator/communities/images/CommunityplatformModeratorCommunitiesImagesController";
import { CommunityplatformAdminCommunitiesImagesController } from "./controllers/communityPlatform/admin/communities/images/CommunityplatformAdminCommunitiesImagesController";
import { CommunityplatformModeratorCommunitiesStatuschangesController } from "./controllers/communityPlatform/moderator/communities/statusChanges/CommunityplatformModeratorCommunitiesStatuschangesController";
import { CommunityplatformAdminCommunitiesStatuschangesController } from "./controllers/communityPlatform/admin/communities/statusChanges/CommunityplatformAdminCommunitiesStatuschangesController";
import { CommunityplatformAdminCommunitiesModeratorassignmentsController } from "./controllers/communityPlatform/admin/communities/moderatorAssignments/CommunityplatformAdminCommunitiesModeratorassignmentsController";
import { CommunityplatformModeratorCommunitiesModeratorassignmentsController } from "./controllers/communityPlatform/moderator/communities/moderatorAssignments/CommunityplatformModeratorCommunitiesModeratorassignmentsController";
import { CommunityplatformPostsController } from "./controllers/communityPlatform/posts/CommunityplatformPostsController";
import { CommunityplatformMemberPostsController } from "./controllers/communityPlatform/member/posts/CommunityplatformMemberPostsController";
import { CommunityplatformModeratorPostsController } from "./controllers/communityPlatform/moderator/posts/CommunityplatformModeratorPostsController";
import { CommunityplatformAdminPostsController } from "./controllers/communityPlatform/admin/posts/CommunityplatformAdminPostsController";
import { CommunityplatformPostsImagesController } from "./controllers/communityPlatform/posts/images/CommunityplatformPostsImagesController";
import { CommunityplatformMemberPostsImagesController } from "./controllers/communityPlatform/member/posts/images/CommunityplatformMemberPostsImagesController";
import { CommunityplatformPostsLinksController } from "./controllers/communityPlatform/posts/links/CommunityplatformPostsLinksController";
import { CommunityplatformMemberPostsLinksController } from "./controllers/communityPlatform/member/posts/links/CommunityplatformMemberPostsLinksController";
import { CommunityplatformPostsCommentsController } from "./controllers/communityPlatform/posts/comments/CommunityplatformPostsCommentsController";
import { CommunityplatformMemberPostsCommentsController } from "./controllers/communityPlatform/member/posts/comments/CommunityplatformMemberPostsCommentsController";
import { CommunityplatformModeratorPostsCommentsController } from "./controllers/communityPlatform/moderator/posts/comments/CommunityplatformModeratorPostsCommentsController";
import { CommunityplatformAdminPostsCommentsController } from "./controllers/communityPlatform/admin/posts/comments/CommunityplatformAdminPostsCommentsController";
import { CommunityplatformMemberSubscriptionsController } from "./controllers/communityPlatform/member/subscriptions/CommunityplatformMemberSubscriptionsController";
import { CommunityplatformAdminSubscriptionsController } from "./controllers/communityPlatform/admin/subscriptions/CommunityplatformAdminSubscriptionsController";
import { CommunityplatformMemberSubscriptionsLogsController } from "./controllers/communityPlatform/member/subscriptions/logs/CommunityplatformMemberSubscriptionsLogsController";
import { CommunityplatformModeratorSubscriptionsLogsController } from "./controllers/communityPlatform/moderator/subscriptions/logs/CommunityplatformModeratorSubscriptionsLogsController";
import { CommunityplatformAdminSubscriptionsLogsController } from "./controllers/communityPlatform/admin/subscriptions/logs/CommunityplatformAdminSubscriptionsLogsController";
import { CommunityplatformModeratorPostsVotesController } from "./controllers/communityPlatform/moderator/posts/votes/CommunityplatformModeratorPostsVotesController";
import { CommunityplatformAdminPostsVotesController } from "./controllers/communityPlatform/admin/posts/votes/CommunityplatformAdminPostsVotesController";
import { CommunityplatformMemberPostsVotesController } from "./controllers/communityPlatform/member/posts/votes/CommunityplatformMemberPostsVotesController";
import { CommunityplatformModeratorCommentsVotesController } from "./controllers/communityPlatform/moderator/comments/votes/CommunityplatformModeratorCommentsVotesController";
import { CommunityplatformAdminCommentsVotesController } from "./controllers/communityPlatform/admin/comments/votes/CommunityplatformAdminCommentsVotesController";
import { CommunityplatformMemberCommentsVotesController } from "./controllers/communityPlatform/member/comments/votes/CommunityplatformMemberCommentsVotesController";
import { CommunityplatformPostsControversialscoreController } from "./controllers/communityPlatform/posts/controversialScore/CommunityplatformPostsControversialscoreController";
import { CommunityplatformCommentsControversialscoreController } from "./controllers/communityPlatform/comments/controversialScore/CommunityplatformCommentsControversialscoreController";
import { CommunityplatformAdminVotelogsController } from "./controllers/communityPlatform/admin/voteLogs/CommunityplatformAdminVotelogsController";
import { CommunityplatformModeratorVotelogsController } from "./controllers/communityPlatform/moderator/voteLogs/CommunityplatformModeratorVotelogsController";
import { CommunityplatformAdminProfilesController } from "./controllers/communityPlatform/admin/profiles/CommunityplatformAdminProfilesController";
import { CommunityplatformModeratorProfilesController } from "./controllers/communityPlatform/moderator/profiles/CommunityplatformModeratorProfilesController";
import { CommunityplatformProfilesController } from "./controllers/communityPlatform/profiles/CommunityplatformProfilesController";
import { CommunityplatformMemberProfilesController } from "./controllers/communityPlatform/member/profiles/CommunityplatformMemberProfilesController";
import { CommunityplatformProfilesBadgesController } from "./controllers/communityPlatform/profiles/badges/CommunityplatformProfilesBadgesController";
import { CommunityplatformAdminProfilesBadgesController } from "./controllers/communityPlatform/admin/profiles/badges/CommunityplatformAdminProfilesBadgesController";
import { CommunityplatformMemberProfilesBadgesController } from "./controllers/communityPlatform/member/profiles/badges/CommunityplatformMemberProfilesBadgesController";
import { CommunityplatformModeratorProfilesBadgesController } from "./controllers/communityPlatform/moderator/profiles/badges/CommunityplatformModeratorProfilesBadgesController";
import { CommunityplatformMemberProfilesHistoryController } from "./controllers/communityPlatform/member/profiles/history/CommunityplatformMemberProfilesHistoryController";
import { CommunityplatformAdminProfilesHistoryController } from "./controllers/communityPlatform/admin/profiles/history/CommunityplatformAdminProfilesHistoryController";
import { CommunityplatformMemberProfilesPreferencesController } from "./controllers/communityPlatform/member/profiles/preferences/CommunityplatformMemberProfilesPreferencesController";
import { CommunityplatformAdminProfilesPreferencesController } from "./controllers/communityPlatform/admin/profiles/preferences/CommunityplatformAdminProfilesPreferencesController";
import { CommunityplatformModeratorReportsController } from "./controllers/communityPlatform/moderator/reports/CommunityplatformModeratorReportsController";
import { CommunityplatformAdminReportsController } from "./controllers/communityPlatform/admin/reports/CommunityplatformAdminReportsController";
import { CommunityplatformMemberReportsController } from "./controllers/communityPlatform/member/reports/CommunityplatformMemberReportsController";
import { CommunityplatformModeratorModerationqueuesController } from "./controllers/communityPlatform/moderator/moderationQueues/CommunityplatformModeratorModerationqueuesController";
import { CommunityplatformAdminModerationqueuesController } from "./controllers/communityPlatform/admin/moderationQueues/CommunityplatformAdminModerationqueuesController";
import { CommunityplatformAdminBanhistoriesController } from "./controllers/communityPlatform/admin/banHistories/CommunityplatformAdminBanhistoriesController";
import { CommunityplatformModeratorBanhistoriesController } from "./controllers/communityPlatform/moderator/banHistories/CommunityplatformModeratorBanhistoriesController";
import { CommunityplatformAdminModerationactionsController } from "./controllers/communityPlatform/admin/moderationActions/CommunityplatformAdminModerationactionsController";
import { CommunityplatformModeratorModerationactionsController } from "./controllers/communityPlatform/moderator/moderationActions/CommunityplatformModeratorModerationactionsController";
import { CommunityplatformAdminEscalationlogsController } from "./controllers/communityPlatform/admin/escalationLogs/CommunityplatformAdminEscalationlogsController";
import { CommunityplatformModeratorEscalationlogsController } from "./controllers/communityPlatform/moderator/escalationLogs/CommunityplatformModeratorEscalationlogsController";
import { CommunityplatformReportcategoriesController } from "./controllers/communityPlatform/reportCategories/CommunityplatformReportcategoriesController";
import { CommunityplatformAdminReportcategoriesController } from "./controllers/communityPlatform/admin/reportCategories/CommunityplatformAdminReportcategoriesController";
import { CommunityplatformAdminKarmaledgersController } from "./controllers/communityPlatform/admin/karmaLedgers/CommunityplatformAdminKarmaledgersController";
import { CommunityplatformMemberKarmaledgersController } from "./controllers/communityPlatform/member/karmaLedgers/CommunityplatformMemberKarmaledgersController";
import { CommunityplatformAdminKarmapenaltiesController } from "./controllers/communityPlatform/admin/karmaPenalties/CommunityplatformAdminKarmapenaltiesController";
import { CommunityplatformModeratorKarmapenaltiesController } from "./controllers/communityPlatform/moderator/karmaPenalties/CommunityplatformModeratorKarmapenaltiesController";
import { CommunityplatformMemberKarmahistoryController } from "./controllers/communityPlatform/member/karmaHistory/CommunityplatformMemberKarmahistoryController";
import { CommunityplatformAdminKarmathresholdsController } from "./controllers/communityPlatform/admin/karmaThresholds/CommunityplatformAdminKarmathresholdsController";
import { CommunityplatformAdminKarmaawardsController } from "./controllers/communityPlatform/admin/karmaAwards/CommunityplatformAdminKarmaawardsController";

@Module({
  controllers: [
    AuthGuestController,
    AuthMemberController,
    AuthModeratorController,
    AuthAdminController,
    CommunityplatformAdminSystemconfigsController,
    CommunityplatformAdminAuditlogsController,
    CommunityplatformAdminBannedwordsController,
    CommunityplatformAdminFileuploadsController,
    CommunityplatformMemberFileuploadsController,
    CommunityplatformModeratorFileuploadsController,
    CommunityplatformAdminMembersController,
    CommunityplatformModeratorMembersController,
    CommunityplatformMembersController,
    CommunityplatformMemberMembersController,
    CommunityplatformAdminModeratorsController,
    CommunityplatformAdminAdminsController,
    CommunityplatformCommunitiesController,
    CommunityplatformMemberCommunitiesController,
    CommunityplatformAdminCommunitiesController,
    CommunityplatformModeratorCommunitiesController,
    CommunityplatformMemberCommunitiesRulesController,
    CommunityplatformModeratorCommunitiesRulesController,
    CommunityplatformAdminCommunitiesRulesController,
    CommunityplatformModeratorCommunitiesBannersController,
    CommunityplatformAdminCommunitiesBannersController,
    CommunityplatformCommunitiesBannersController,
    CommunityplatformCommunitiesImagesController,
    CommunityplatformModeratorCommunitiesImagesController,
    CommunityplatformAdminCommunitiesImagesController,
    CommunityplatformModeratorCommunitiesStatuschangesController,
    CommunityplatformAdminCommunitiesStatuschangesController,
    CommunityplatformAdminCommunitiesModeratorassignmentsController,
    CommunityplatformModeratorCommunitiesModeratorassignmentsController,
    CommunityplatformPostsController,
    CommunityplatformMemberPostsController,
    CommunityplatformModeratorPostsController,
    CommunityplatformAdminPostsController,
    CommunityplatformPostsImagesController,
    CommunityplatformMemberPostsImagesController,
    CommunityplatformPostsLinksController,
    CommunityplatformMemberPostsLinksController,
    CommunityplatformPostsCommentsController,
    CommunityplatformMemberPostsCommentsController,
    CommunityplatformModeratorPostsCommentsController,
    CommunityplatformAdminPostsCommentsController,
    CommunityplatformMemberSubscriptionsController,
    CommunityplatformAdminSubscriptionsController,
    CommunityplatformMemberSubscriptionsLogsController,
    CommunityplatformModeratorSubscriptionsLogsController,
    CommunityplatformAdminSubscriptionsLogsController,
    CommunityplatformModeratorPostsVotesController,
    CommunityplatformAdminPostsVotesController,
    CommunityplatformMemberPostsVotesController,
    CommunityplatformModeratorCommentsVotesController,
    CommunityplatformAdminCommentsVotesController,
    CommunityplatformMemberCommentsVotesController,
    CommunityplatformPostsControversialscoreController,
    CommunityplatformCommentsControversialscoreController,
    CommunityplatformAdminVotelogsController,
    CommunityplatformModeratorVotelogsController,
    CommunityplatformAdminProfilesController,
    CommunityplatformModeratorProfilesController,
    CommunityplatformProfilesController,
    CommunityplatformMemberProfilesController,
    CommunityplatformProfilesBadgesController,
    CommunityplatformAdminProfilesBadgesController,
    CommunityplatformMemberProfilesBadgesController,
    CommunityplatformModeratorProfilesBadgesController,
    CommunityplatformMemberProfilesHistoryController,
    CommunityplatformAdminProfilesHistoryController,
    CommunityplatformMemberProfilesPreferencesController,
    CommunityplatformAdminProfilesPreferencesController,
    CommunityplatformModeratorReportsController,
    CommunityplatformAdminReportsController,
    CommunityplatformMemberReportsController,
    CommunityplatformModeratorModerationqueuesController,
    CommunityplatformAdminModerationqueuesController,
    CommunityplatformAdminBanhistoriesController,
    CommunityplatformModeratorBanhistoriesController,
    CommunityplatformAdminModerationactionsController,
    CommunityplatformModeratorModerationactionsController,
    CommunityplatformAdminEscalationlogsController,
    CommunityplatformModeratorEscalationlogsController,
    CommunityplatformReportcategoriesController,
    CommunityplatformAdminReportcategoriesController,
    CommunityplatformAdminKarmaledgersController,
    CommunityplatformMemberKarmaledgersController,
    CommunityplatformAdminKarmapenaltiesController,
    CommunityplatformModeratorKarmapenaltiesController,
    CommunityplatformMemberKarmahistoryController,
    CommunityplatformAdminKarmathresholdsController,
    CommunityplatformAdminKarmaawardsController,
  ],
})
export class MyModule {}
