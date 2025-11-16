import { Module } from "@nestjs/common";

import { AuthGuestController } from "./controllers/auth/guest/AuthGuestController";
import { AuthMemberController } from "./controllers/auth/member/AuthMemberController";
import { AuthModeratorController } from "./controllers/auth/moderator/AuthModeratorController";
import { RedditcommunityMembersController } from "./controllers/redditCommunity/members/RedditcommunityMembersController";
import { RedditcommunityMemberMembersController } from "./controllers/redditCommunity/member/members/RedditcommunityMemberMembersController";
import { RedditcommunityMembersProfileController } from "./controllers/redditCommunity/members/profile/RedditcommunityMembersProfileController";
import { RedditcommunityMembersActivityController } from "./controllers/redditCommunity/members/activity/RedditcommunityMembersActivityController";
import { RedditcommunityMemberMembersSessionsController } from "./controllers/redditCommunity/member/members/sessions/RedditcommunityMemberMembersSessionsController";
import { RedditcommunityModeratorModeratorsController } from "./controllers/redditCommunity/moderator/moderators/RedditcommunityModeratorModeratorsController";
import { RedditcommunityModeratorsProfileController } from "./controllers/redditCommunity/moderators/profile/RedditcommunityModeratorsProfileController";
import { RedditcommunityModeratorModeratorsActivityController } from "./controllers/redditCommunity/moderator/moderators/activity/RedditcommunityModeratorModeratorsActivityController";
import { RedditcommunityModeratorsKarmaController } from "./controllers/redditCommunity/moderators/karma/RedditcommunityModeratorsKarmaController";
import { RedditcommunityModeratorModeratorsSessionsController } from "./controllers/redditCommunity/moderator/moderators/sessions/RedditcommunityModeratorModeratorsSessionsController";
import { RedditcommunityModeratorGuestsController } from "./controllers/redditCommunity/moderator/guests/RedditcommunityModeratorGuestsController";
import { RedditcommunityCommunitiesController } from "./controllers/redditCommunity/communities/RedditcommunityCommunitiesController";
import { RedditcommunityModeratorCommunitiesController } from "./controllers/redditCommunity/moderator/communities/RedditcommunityModeratorCommunitiesController";
import { RedditcommunityMemberCommunitiesSubscriptionsController } from "./controllers/redditCommunity/member/communities/subscriptions/RedditcommunityMemberCommunitiesSubscriptionsController";
import { RedditcommunityMemberSubscriptionsController } from "./controllers/redditCommunity/member/subscriptions/RedditcommunityMemberSubscriptionsController";
import { RedditcommunityCommunitiesModeratorsController } from "./controllers/redditCommunity/communities/moderators/RedditcommunityCommunitiesModeratorsController";
import { RedditcommunityModeratorCommunitiesModeratorsController } from "./controllers/redditCommunity/moderator/communities/moderators/RedditcommunityModeratorCommunitiesModeratorsController";
import { RedditcommunityCommunitiesRulesController } from "./controllers/redditCommunity/communities/rules/RedditcommunityCommunitiesRulesController";
import { RedditcommunityModeratorCommunitiesRulesController } from "./controllers/redditCommunity/moderator/communities/rules/RedditcommunityModeratorCommunitiesRulesController";
import { RedditcommunityMemberMembersSubscriptionsController } from "./controllers/redditCommunity/member/members/subscriptions/RedditcommunityMemberMembersSubscriptionsController";
import { RedditcommunityStatisticsCommunitiesController } from "./controllers/redditCommunity/statistics/communities/trending/RedditcommunityStatisticsCommunitiesController";
import { RedditcommunityStatisticsCommunitiesPopularController } from "./controllers/redditCommunity/statistics/communities/popular/RedditcommunityStatisticsCommunitiesPopularController";
import { RedditcommunityPostsController } from "./controllers/redditCommunity/posts/RedditcommunityPostsController";
import { RedditcommunityMemberPostsController } from "./controllers/redditCommunity/member/posts/RedditcommunityMemberPostsController";
import { RedditcommunityPostsCommentsController } from "./controllers/redditCommunity/posts/comments/RedditcommunityPostsCommentsController";
import { RedditcommunityMemberPostsCommentsController } from "./controllers/redditCommunity/member/posts/comments/RedditcommunityMemberPostsCommentsController";
import { RedditcommunityModeratorPostsCommentsController } from "./controllers/redditCommunity/moderator/posts/comments/RedditcommunityModeratorPostsCommentsController";
import { RedditcommunityPostsCommentsRepliesController } from "./controllers/redditCommunity/posts/comments/replies/RedditcommunityPostsCommentsRepliesController";
import { RedditcommunityMemberPostsCommentsRepliesController } from "./controllers/redditCommunity/member/posts/comments/replies/RedditcommunityMemberPostsCommentsRepliesController";
import { RedditcommunityMemberPostsVotesController } from "./controllers/redditCommunity/member/posts/votes/RedditcommunityMemberPostsVotesController";
import { RedditcommunityMemberCommentsVotesController } from "./controllers/redditCommunity/member/comments/votes/RedditcommunityMemberCommentsVotesController";
import { RedditcommunityMemberReportsController } from "./controllers/redditCommunity/member/reports/RedditcommunityMemberReportsController";
import { RedditcommunityModeratorReportsController } from "./controllers/redditCommunity/moderator/reports/RedditcommunityModeratorReportsController";
import { RedditcommunityModeratorCommunitiesReportsController } from "./controllers/redditCommunity/moderator/communities/reports/RedditcommunityModeratorCommunitiesReportsController";
import { RedditcommunityModeratorCommunitiesReportsStatisticsController } from "./controllers/redditCommunity/moderator/communities/reports/statistics/RedditcommunityModeratorCommunitiesReportsStatisticsController";
import { RedditcommunityMemberPostsReportsController } from "./controllers/redditCommunity/member/posts/reports/RedditcommunityMemberPostsReportsController";
import { RedditcommunityMemberCommentsReportsController } from "./controllers/redditCommunity/member/comments/reports/RedditcommunityMemberCommentsReportsController";
import { RedditcommunityModeratorModerationactionsController } from "./controllers/redditCommunity/moderator/moderationActions/RedditcommunityModeratorModerationactionsController";
import { RedditcommunityModeratorCommunitiesModerationactionsController } from "./controllers/redditCommunity/moderator/communities/moderationActions/RedditcommunityModeratorCommunitiesModerationactionsController";
import { RedditcommunityModeratorBansController } from "./controllers/redditCommunity/moderator/bans/RedditcommunityModeratorBansController";
import { RedditcommunityModeratorCommunitiesBansController } from "./controllers/redditCommunity/moderator/communities/bans/RedditcommunityModeratorCommunitiesBansController";
import { RedditcommunityModeratorMembersBansController } from "./controllers/redditCommunity/moderator/members/bans/RedditcommunityModeratorMembersBansController";
import { RedditcommunityModeratorBanappealsController } from "./controllers/redditCommunity/moderator/banAppeals/RedditcommunityModeratorBanappealsController";
import { RedditcommunityMemberBanappealsController } from "./controllers/redditCommunity/member/banAppeals/RedditcommunityMemberBanappealsController";
import { RedditcommunityMemberBansAppealController } from "./controllers/redditCommunity/member/bans/appeal/RedditcommunityMemberBansAppealController";
import { RedditcommunityModeratorCommunitiesBanappealsController } from "./controllers/redditCommunity/moderator/communities/banAppeals/RedditcommunityModeratorCommunitiesBanappealsController";
import { RedditcommunityMemberNotificationsController } from "./controllers/redditCommunity/member/notifications/RedditcommunityMemberNotificationsController";
import { RedditcommunityMemberNotificationsUnreadcountController } from "./controllers/redditCommunity/member/notifications/unreadCount/RedditcommunityMemberNotificationsUnreadcountController";

@Module({
  controllers: [
    AuthGuestController,
    AuthMemberController,
    AuthModeratorController,
    RedditcommunityMembersController,
    RedditcommunityMemberMembersController,
    RedditcommunityMembersProfileController,
    RedditcommunityMembersActivityController,
    RedditcommunityMemberMembersSessionsController,
    RedditcommunityModeratorModeratorsController,
    RedditcommunityModeratorsProfileController,
    RedditcommunityModeratorModeratorsActivityController,
    RedditcommunityModeratorsKarmaController,
    RedditcommunityModeratorModeratorsSessionsController,
    RedditcommunityModeratorGuestsController,
    RedditcommunityCommunitiesController,
    RedditcommunityModeratorCommunitiesController,
    RedditcommunityMemberCommunitiesSubscriptionsController,
    RedditcommunityMemberSubscriptionsController,
    RedditcommunityCommunitiesModeratorsController,
    RedditcommunityModeratorCommunitiesModeratorsController,
    RedditcommunityCommunitiesRulesController,
    RedditcommunityModeratorCommunitiesRulesController,
    RedditcommunityMemberMembersSubscriptionsController,
    RedditcommunityStatisticsCommunitiesController,
    RedditcommunityStatisticsCommunitiesPopularController,
    RedditcommunityPostsController,
    RedditcommunityMemberPostsController,
    RedditcommunityPostsCommentsController,
    RedditcommunityMemberPostsCommentsController,
    RedditcommunityModeratorPostsCommentsController,
    RedditcommunityPostsCommentsRepliesController,
    RedditcommunityMemberPostsCommentsRepliesController,
    RedditcommunityMemberPostsVotesController,
    RedditcommunityMemberCommentsVotesController,
    RedditcommunityMemberReportsController,
    RedditcommunityModeratorReportsController,
    RedditcommunityModeratorCommunitiesReportsController,
    RedditcommunityModeratorCommunitiesReportsStatisticsController,
    RedditcommunityMemberPostsReportsController,
    RedditcommunityMemberCommentsReportsController,
    RedditcommunityModeratorModerationactionsController,
    RedditcommunityModeratorCommunitiesModerationactionsController,
    RedditcommunityModeratorBansController,
    RedditcommunityModeratorCommunitiesBansController,
    RedditcommunityModeratorMembersBansController,
    RedditcommunityModeratorBanappealsController,
    RedditcommunityMemberBanappealsController,
    RedditcommunityMemberBansAppealController,
    RedditcommunityModeratorCommunitiesBanappealsController,
    RedditcommunityMemberNotificationsController,
    RedditcommunityMemberNotificationsUnreadcountController,
  ],
})
export class MyModule {}
