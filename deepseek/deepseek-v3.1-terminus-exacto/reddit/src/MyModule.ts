import { Module } from "@nestjs/common";

import { AuthGuestController } from "./controllers/auth/guest/AuthGuestController";
import { AuthMemberController } from "./controllers/auth/member/AuthMemberController";
import { AuthModeratorController } from "./controllers/auth/moderator/AuthModeratorController";
import { AuthAdminController } from "./controllers/auth/admin/AuthAdminController";
import { CommunityplatformChannelsController } from "./controllers/communityPlatform/channels/CommunityplatformChannelsController";
import { CommunityplatformAdminChannelsController } from "./controllers/communityPlatform/admin/channels/CommunityplatformAdminChannelsController";
import { CommunityplatformAdminChannelsSectionsController } from "./controllers/communityPlatform/admin/channels/sections/CommunityplatformAdminChannelsSectionsController";
import { CommunityplatformChannelsSectionsController } from "./controllers/communityPlatform/channels/sections/CommunityplatformChannelsSectionsController";
import { CommunityplatformCategoriesController } from "./controllers/communityPlatform/categories/CommunityplatformCategoriesController";
import { CommunityplatformAdminCategoriesController } from "./controllers/communityPlatform/admin/categories/CommunityplatformAdminCategoriesController";
import { CommunityplatformAdminConfigurationsController } from "./controllers/communityPlatform/admin/configurations/CommunityplatformAdminConfigurationsController";
import { CommunityplatformAdminMembersController } from "./controllers/communityPlatform/admin/members/CommunityplatformAdminMembersController";
import { CommunityplatformModeratorMembersController } from "./controllers/communityPlatform/moderator/members/CommunityplatformModeratorMembersController";
import { CommunityplatformMemberMembersController } from "./controllers/communityPlatform/member/members/CommunityplatformMemberMembersController";
import { CommunityplatformMemberMembersProfilesController } from "./controllers/communityPlatform/member/members/profiles/CommunityplatformMemberMembersProfilesController";
import { CommunityplatformMembersProfilesController } from "./controllers/communityPlatform/members/profiles/CommunityplatformMembersProfilesController";
import { CommunityplatformMemberMembersPreferencesController } from "./controllers/communityPlatform/member/members/preferences/CommunityplatformMemberMembersPreferencesController";
import { CommunityplatformAdminMembersSessionsController } from "./controllers/communityPlatform/admin/members/sessions/CommunityplatformAdminMembersSessionsController";
import { CommunityplatformAdminModeratorsController } from "./controllers/communityPlatform/admin/moderators/CommunityplatformAdminModeratorsController";
import { CommunityplatformAdminModeratorsSessionsController } from "./controllers/communityPlatform/admin/moderators/sessions/CommunityplatformAdminModeratorsSessionsController";
import { CommunityplatformAdminAdminsController } from "./controllers/communityPlatform/admin/admins/CommunityplatformAdminAdminsController";
import { CommunityplatformAdminAdminsSessionsController } from "./controllers/communityPlatform/admin/admins/sessions/CommunityplatformAdminAdminsSessionsController";
import { CommunityplatformAdminGuestsController } from "./controllers/communityPlatform/admin/guests/CommunityplatformAdminGuestsController";
import { CommunityplatformGuestsController } from "./controllers/communityPlatform/guests/CommunityplatformGuestsController";
import { CommunityplatformCommunitiesController } from "./controllers/communityPlatform/communities/CommunityplatformCommunitiesController";
import { CommunityplatformMemberCommunitiesController } from "./controllers/communityPlatform/member/communities/CommunityplatformMemberCommunitiesController";
import { CommunityplatformModeratorCommunitiesController } from "./controllers/communityPlatform/moderator/communities/CommunityplatformModeratorCommunitiesController";
import { CommunityplatformAdminCommunitiesController } from "./controllers/communityPlatform/admin/communities/CommunityplatformAdminCommunitiesController";
import { CommunityplatformAdminCommunitiesSettingsController } from "./controllers/communityPlatform/admin/communities/settings/CommunityplatformAdminCommunitiesSettingsController";
import { CommunityplatformModeratorCommunitiesSettingsController } from "./controllers/communityPlatform/moderator/communities/settings/CommunityplatformModeratorCommunitiesSettingsController";
import { CommunityplatformMemberCommunitiesSettingsController } from "./controllers/communityPlatform/member/communities/settings/CommunityplatformMemberCommunitiesSettingsController";
import { CommunityplatformModeratorCommunitiesMembersController } from "./controllers/communityPlatform/moderator/communities/members/CommunityplatformModeratorCommunitiesMembersController";
import { CommunityplatformAdminCommunitiesMembersController } from "./controllers/communityPlatform/admin/communities/members/CommunityplatformAdminCommunitiesMembersController";
import { CommunityplatformMemberCommunitiesMembersController } from "./controllers/communityPlatform/member/communities/members/CommunityplatformMemberCommunitiesMembersController";
import { CommunityplatformAdminCommunitiesModeratorsController } from "./controllers/communityPlatform/admin/communities/moderators/CommunityplatformAdminCommunitiesModeratorsController";
import { CommunityplatformCommunitiesCategoriesController } from "./controllers/communityPlatform/communities/categories/CommunityplatformCommunitiesCategoriesController";
import { CommunityplatformAdminCommunitiesCategoriesController } from "./controllers/communityPlatform/admin/communities/categories/CommunityplatformAdminCommunitiesCategoriesController";
import { CommunityplatformPostsController } from "./controllers/communityPlatform/posts/CommunityplatformPostsController";
import { CommunityplatformAdminCommunitiesCategoryController } from "./controllers/communityPlatform/admin/communities/category/CommunityplatformAdminCommunitiesCategoryController";
import { CommunityplatformMemberPostsController } from "./controllers/communityPlatform/member/posts/CommunityplatformMemberPostsController";
import { CommunityplatformModeratorPostsController } from "./controllers/communityPlatform/moderator/posts/CommunityplatformModeratorPostsController";
import { CommunityplatformAdminPostsController } from "./controllers/communityPlatform/admin/posts/CommunityplatformAdminPostsController";
import { CommunityplatformPostsContentsController } from "./controllers/communityPlatform/posts/contents/CommunityplatformPostsContentsController";
import { CommunityplatformMemberPostsContentsController } from "./controllers/communityPlatform/member/posts/contents/CommunityplatformMemberPostsContentsController";
import { CommunityplatformMemberPostsMediaController } from "./controllers/communityPlatform/member/posts/media/CommunityplatformMemberPostsMediaController";
import { CommunityplatformPostsMediaController } from "./controllers/communityPlatform/posts/media/CommunityplatformPostsMediaController";
import { CommunityplatformAdminPostsMediaController } from "./controllers/communityPlatform/admin/posts/media/CommunityplatformAdminPostsMediaController";
import { CommunityplatformModeratorPostsMediaController } from "./controllers/communityPlatform/moderator/posts/media/CommunityplatformModeratorPostsMediaController";
import { CommunityplatformPostsPollsController } from "./controllers/communityPlatform/posts/polls/CommunityplatformPostsPollsController";
import { CommunityplatformMemberPostsPollsController } from "./controllers/communityPlatform/member/posts/polls/CommunityplatformMemberPostsPollsController";
import { CommunityplatformModeratorPostsPollsController } from "./controllers/communityPlatform/moderator/posts/polls/CommunityplatformModeratorPostsPollsController";
import { CommunityplatformAdminPostsPollsController } from "./controllers/communityPlatform/admin/posts/polls/CommunityplatformAdminPostsPollsController";
import { CommunityplatformPostsPollsOptionsController } from "./controllers/communityPlatform/posts/polls/options/CommunityplatformPostsPollsOptionsController";
import { CommunityplatformMemberPostsPollsOptionsController } from "./controllers/communityPlatform/member/posts/polls/options/CommunityplatformMemberPostsPollsOptionsController";
import { CommunityplatformModeratorPostsPollsOptionsController } from "./controllers/communityPlatform/moderator/posts/polls/options/CommunityplatformModeratorPostsPollsOptionsController";
import { CommunityplatformMemberPostsVotesController } from "./controllers/communityPlatform/member/posts/votes/CommunityplatformMemberPostsVotesController";
import { CommunityplatformModeratorPostsVotesController } from "./controllers/communityPlatform/moderator/posts/votes/CommunityplatformModeratorPostsVotesController";
import { CommunityplatformAdminPostsVotesController } from "./controllers/communityPlatform/admin/posts/votes/CommunityplatformAdminPostsVotesController";
import { CommunityplatformAdminPostsReportsController } from "./controllers/communityPlatform/admin/posts/reports/CommunityplatformAdminPostsReportsController";
import { CommunityplatformModeratorPostsReportsController } from "./controllers/communityPlatform/moderator/posts/reports/CommunityplatformModeratorPostsReportsController";
import { CommunityplatformMemberPostsReportsController } from "./controllers/communityPlatform/member/posts/reports/CommunityplatformMemberPostsReportsController";
import { CommunityplatformCommentsController } from "./controllers/communityPlatform/comments/CommunityplatformCommentsController";
import { CommunityplatformMemberCommentsController } from "./controllers/communityPlatform/member/comments/CommunityplatformMemberCommentsController";
import { CommunityplatformMemberPostsCommentsController } from "./controllers/communityPlatform/member/posts/comments/CommunityplatformMemberPostsCommentsController";
import { CommunityplatformAdminCommentsController } from "./controllers/communityPlatform/admin/comments/CommunityplatformAdminCommentsController";
import { CommunityplatformModeratorCommentsController } from "./controllers/communityPlatform/moderator/comments/CommunityplatformModeratorCommentsController";
import { CommunityplatformAdminCommentsVotesController } from "./controllers/communityPlatform/admin/comments/votes/CommunityplatformAdminCommentsVotesController";
import { CommunityplatformModeratorCommentsVotesController } from "./controllers/communityPlatform/moderator/comments/votes/CommunityplatformModeratorCommentsVotesController";
import { CommunityplatformMemberCommentsVotesController } from "./controllers/communityPlatform/member/comments/votes/CommunityplatformMemberCommentsVotesController";
import { CommunityplatformMemberVotesController } from "./controllers/communityPlatform/member/votes/CommunityplatformMemberVotesController";
import { CommunityplatformModeratorCommentsReportsController } from "./controllers/communityPlatform/moderator/comments/reports/CommunityplatformModeratorCommentsReportsController";
import { CommunityplatformAdminCommentsReportsController } from "./controllers/communityPlatform/admin/comments/reports/CommunityplatformAdminCommentsReportsController";
import { CommunityplatformCommentsReportsController } from "./controllers/communityPlatform/comments/reports/CommunityplatformCommentsReportsController";
import { CommunityplatformMemberCommentsReportsController } from "./controllers/communityPlatform/member/comments/reports/CommunityplatformMemberCommentsReportsController";
import { CommunityplatformPostsCommentsController } from "./controllers/communityPlatform/posts/comments/CommunityplatformPostsCommentsController";
import { CommunityplatformModeratorPostsCommentsController } from "./controllers/communityPlatform/moderator/posts/comments/CommunityplatformModeratorPostsCommentsController";
import { CommunityplatformAdminPostsCommentsController } from "./controllers/communityPlatform/admin/posts/comments/CommunityplatformAdminPostsCommentsController";
import { CommunityplatformModeratorVotesController } from "./controllers/communityPlatform/moderator/votes/CommunityplatformModeratorVotesController";
import { CommunityplatformAdminVotesController } from "./controllers/communityPlatform/admin/votes/CommunityplatformAdminVotesController";
import { CommunityplatformAdminVotescoresController } from "./controllers/communityPlatform/admin/voteScores/CommunityplatformAdminVotescoresController";
import { CommunityplatformAdminVotelimitsController } from "./controllers/communityPlatform/admin/voteLimits/CommunityplatformAdminVotelimitsController";
import { CommunityplatformAdminModerationactionsController } from "./controllers/communityPlatform/admin/moderationActions/CommunityplatformAdminModerationactionsController";
import { CommunityplatformModeratorModerationactionsController } from "./controllers/communityPlatform/moderator/moderationActions/CommunityplatformModeratorModerationactionsController";
import { CommunityplatformAdminModerationreportsController } from "./controllers/communityPlatform/admin/moderationReports/CommunityplatformAdminModerationreportsController";
import { CommunityplatformModeratorModerationreportsController } from "./controllers/communityPlatform/moderator/moderationReports/CommunityplatformModeratorModerationreportsController";
import { CommunityplatformMemberModerationreportsController } from "./controllers/communityPlatform/member/moderationReports/CommunityplatformMemberModerationreportsController";
import { CommunityplatformModeratorModerationqueuesController } from "./controllers/communityPlatform/moderator/moderationQueues/CommunityplatformModeratorModerationqueuesController";
import { CommunityplatformAdminModerationqueuesController } from "./controllers/communityPlatform/admin/moderationQueues/CommunityplatformAdminModerationqueuesController";
import { CommunityplatformAdminUserbansController } from "./controllers/communityPlatform/admin/userBans/CommunityplatformAdminUserbansController";
import { CommunityplatformModeratorUserbansController } from "./controllers/communityPlatform/moderator/userBans/CommunityplatformModeratorUserbansController";
import { CommunityplatformMemberSubscriptionsController } from "./controllers/communityPlatform/member/subscriptions/CommunityplatformMemberSubscriptionsController";
import { CommunityplatformAdminSubscriptionsController } from "./controllers/communityPlatform/admin/subscriptions/CommunityplatformAdminSubscriptionsController";
import { CommunityplatformAdminNotificationpreferencesController } from "./controllers/communityPlatform/admin/notificationPreferences/CommunityplatformAdminNotificationpreferencesController";
import { CommunityplatformMemberNotificationpreferencesController } from "./controllers/communityPlatform/member/notificationPreferences/CommunityplatformMemberNotificationpreferencesController";
import { CommunityplatformModeratorNotificationpreferencesController } from "./controllers/communityPlatform/moderator/notificationPreferences/CommunityplatformModeratorNotificationpreferencesController";
import { CommunityplatformAdminPushtokensController } from "./controllers/communityPlatform/admin/pushTokens/CommunityplatformAdminPushtokensController";
import { CommunityplatformMemberPushtokensController } from "./controllers/communityPlatform/member/pushTokens/CommunityplatformMemberPushtokensController";
import { CommunityplatformAdminMediafilesController } from "./controllers/communityPlatform/admin/mediaFiles/CommunityplatformAdminMediafilesController";
import { CommunityplatformMemberMediafilesController } from "./controllers/communityPlatform/member/mediaFiles/CommunityplatformMemberMediafilesController";
import { CommunityplatformMemberMediafilesThumbnailsController } from "./controllers/communityPlatform/member/mediaFiles/thumbnails/CommunityplatformMemberMediafilesThumbnailsController";
import { CommunityplatformModeratorMediafilesThumbnailsController } from "./controllers/communityPlatform/moderator/mediaFiles/thumbnails/CommunityplatformModeratorMediafilesThumbnailsController";
import { CommunityplatformAdminMediafilesThumbnailsController } from "./controllers/communityPlatform/admin/mediaFiles/thumbnails/CommunityplatformAdminMediafilesThumbnailsController";
import { CommunityplatformAdminMediafilesMetadataController } from "./controllers/communityPlatform/admin/mediaFiles/metadata/CommunityplatformAdminMediafilesMetadataController";
import { CommunityplatformModeratorMediafilesMetadataController } from "./controllers/communityPlatform/moderator/mediaFiles/metadata/CommunityplatformModeratorMediafilesMetadataController";
import { CommunityplatformAdminMediafilesCdnController } from "./controllers/communityPlatform/admin/mediaFiles/cdn/CommunityplatformAdminMediafilesCdnController";
import { CommunityplatformMemberMediafilesCdnController } from "./controllers/communityPlatform/member/mediaFiles/cdn/CommunityplatformMemberMediafilesCdnController";
import { CommunityplatformModeratorMediafilesCdnController } from "./controllers/communityPlatform/moderator/mediaFiles/cdn/CommunityplatformModeratorMediafilesCdnController";

@Module({
  controllers: [
    AuthGuestController,
    AuthMemberController,
    AuthModeratorController,
    AuthAdminController,
    CommunityplatformChannelsController,
    CommunityplatformAdminChannelsController,
    CommunityplatformAdminChannelsSectionsController,
    CommunityplatformChannelsSectionsController,
    CommunityplatformCategoriesController,
    CommunityplatformAdminCategoriesController,
    CommunityplatformAdminConfigurationsController,
    CommunityplatformAdminMembersController,
    CommunityplatformModeratorMembersController,
    CommunityplatformMemberMembersController,
    CommunityplatformMemberMembersProfilesController,
    CommunityplatformMembersProfilesController,
    CommunityplatformMemberMembersPreferencesController,
    CommunityplatformAdminMembersSessionsController,
    CommunityplatformAdminModeratorsController,
    CommunityplatformAdminModeratorsSessionsController,
    CommunityplatformAdminAdminsController,
    CommunityplatformAdminAdminsSessionsController,
    CommunityplatformAdminGuestsController,
    CommunityplatformGuestsController,
    CommunityplatformCommunitiesController,
    CommunityplatformMemberCommunitiesController,
    CommunityplatformModeratorCommunitiesController,
    CommunityplatformAdminCommunitiesController,
    CommunityplatformAdminCommunitiesSettingsController,
    CommunityplatformModeratorCommunitiesSettingsController,
    CommunityplatformMemberCommunitiesSettingsController,
    CommunityplatformModeratorCommunitiesMembersController,
    CommunityplatformAdminCommunitiesMembersController,
    CommunityplatformMemberCommunitiesMembersController,
    CommunityplatformAdminCommunitiesModeratorsController,
    CommunityplatformCommunitiesCategoriesController,
    CommunityplatformAdminCommunitiesCategoriesController,
    CommunityplatformPostsController,
    CommunityplatformAdminCommunitiesCategoryController,
    CommunityplatformMemberPostsController,
    CommunityplatformModeratorPostsController,
    CommunityplatformAdminPostsController,
    CommunityplatformPostsContentsController,
    CommunityplatformMemberPostsContentsController,
    CommunityplatformMemberPostsMediaController,
    CommunityplatformPostsMediaController,
    CommunityplatformAdminPostsMediaController,
    CommunityplatformModeratorPostsMediaController,
    CommunityplatformPostsPollsController,
    CommunityplatformMemberPostsPollsController,
    CommunityplatformModeratorPostsPollsController,
    CommunityplatformAdminPostsPollsController,
    CommunityplatformPostsPollsOptionsController,
    CommunityplatformMemberPostsPollsOptionsController,
    CommunityplatformModeratorPostsPollsOptionsController,
    CommunityplatformMemberPostsVotesController,
    CommunityplatformModeratorPostsVotesController,
    CommunityplatformAdminPostsVotesController,
    CommunityplatformAdminPostsReportsController,
    CommunityplatformModeratorPostsReportsController,
    CommunityplatformMemberPostsReportsController,
    CommunityplatformCommentsController,
    CommunityplatformMemberCommentsController,
    CommunityplatformMemberPostsCommentsController,
    CommunityplatformAdminCommentsController,
    CommunityplatformModeratorCommentsController,
    CommunityplatformAdminCommentsVotesController,
    CommunityplatformModeratorCommentsVotesController,
    CommunityplatformMemberCommentsVotesController,
    CommunityplatformMemberVotesController,
    CommunityplatformModeratorCommentsReportsController,
    CommunityplatformAdminCommentsReportsController,
    CommunityplatformCommentsReportsController,
    CommunityplatformMemberCommentsReportsController,
    CommunityplatformPostsCommentsController,
    CommunityplatformModeratorPostsCommentsController,
    CommunityplatformAdminPostsCommentsController,
    CommunityplatformModeratorVotesController,
    CommunityplatformAdminVotesController,
    CommunityplatformAdminVotescoresController,
    CommunityplatformAdminVotelimitsController,
    CommunityplatformAdminModerationactionsController,
    CommunityplatformModeratorModerationactionsController,
    CommunityplatformAdminModerationreportsController,
    CommunityplatformModeratorModerationreportsController,
    CommunityplatformMemberModerationreportsController,
    CommunityplatformModeratorModerationqueuesController,
    CommunityplatformAdminModerationqueuesController,
    CommunityplatformAdminUserbansController,
    CommunityplatformModeratorUserbansController,
    CommunityplatformMemberSubscriptionsController,
    CommunityplatformAdminSubscriptionsController,
    CommunityplatformAdminNotificationpreferencesController,
    CommunityplatformMemberNotificationpreferencesController,
    CommunityplatformModeratorNotificationpreferencesController,
    CommunityplatformAdminPushtokensController,
    CommunityplatformMemberPushtokensController,
    CommunityplatformAdminMediafilesController,
    CommunityplatformMemberMediafilesController,
    CommunityplatformMemberMediafilesThumbnailsController,
    CommunityplatformModeratorMediafilesThumbnailsController,
    CommunityplatformAdminMediafilesThumbnailsController,
    CommunityplatformAdminMediafilesMetadataController,
    CommunityplatformModeratorMediafilesMetadataController,
    CommunityplatformAdminMediafilesCdnController,
    CommunityplatformMemberMediafilesCdnController,
    CommunityplatformModeratorMediafilesCdnController,
  ],
})
export class MyModule {}
