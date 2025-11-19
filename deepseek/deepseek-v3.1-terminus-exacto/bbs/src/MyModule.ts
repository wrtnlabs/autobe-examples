import { Module } from "@nestjs/common";

import { AuthGuestController } from "./controllers/auth/guest/AuthGuestController";
import { AuthMemberController } from "./controllers/auth/member/AuthMemberController";
import { AuthModeratorController } from "./controllers/auth/moderator/AuthModeratorController";
import { DiscussionboardChannelsController } from "./controllers/discussionBoard/channels/DiscussionboardChannelsController";
import { DiscussionboardModeratorChannelsController } from "./controllers/discussionBoard/moderator/channels/DiscussionboardModeratorChannelsController";
import { DiscussionboardChannelsSectionsController } from "./controllers/discussionBoard/channels/sections/DiscussionboardChannelsSectionsController";
import { DiscussionboardModeratorChannelsSectionsController } from "./controllers/discussionBoard/moderator/channels/sections/DiscussionboardModeratorChannelsSectionsController";
import { DiscussionboardChannelsPostsController } from "./controllers/discussionBoard/channels/posts/DiscussionboardChannelsPostsController";
import { DiscussionboardModeratorConfigurationsController } from "./controllers/discussionBoard/moderator/configurations/DiscussionboardModeratorConfigurationsController";
import { PostsController } from "./controllers/posts/PostsController";
import { DiscussionboardConfigurationsController } from "./controllers/discussionBoard/configurations/DiscussionboardConfigurationsController";
import { DiscussionboardModeratorGuestsController } from "./controllers/discussionBoard/moderator/guests/DiscussionboardModeratorGuestsController";
import { DiscussionboardModeratorMembersController } from "./controllers/discussionBoard/moderator/members/DiscussionboardModeratorMembersController";
import { DiscussionboardMemberMembersController } from "./controllers/discussionBoard/member/members/DiscussionboardMemberMembersController";
import { DiscussionboardModeratorMembersSessionsController } from "./controllers/discussionBoard/moderator/members/sessions/DiscussionboardModeratorMembersSessionsController";
import { DiscussionboardMemberMembersSessionsController } from "./controllers/discussionBoard/member/members/sessions/DiscussionboardMemberMembersSessionsController";
import { DiscussionboardMembersSessionsController } from "./controllers/discussionBoard/members/sessions/DiscussionboardMembersSessionsController";
import { DiscussionboardModeratorModeratorsController } from "./controllers/discussionBoard/moderator/moderators/DiscussionboardModeratorModeratorsController";
import { DiscussionboardModeratorModeratorsSessionsController } from "./controllers/discussionBoard/moderator/moderators/sessions/DiscussionboardModeratorModeratorsSessionsController";
import { DiscussionboardMemberPostsController } from "./controllers/discussionBoard/member/posts/DiscussionboardMemberPostsController";
import { DiscussionboardModeratorPostsController } from "./controllers/discussionBoard/moderator/posts/DiscussionboardModeratorPostsController";
import { DiscussionboardMemberPostsCommentsController } from "./controllers/discussionBoard/member/posts/comments/DiscussionboardMemberPostsCommentsController";
import { DiscussionboardModeratorPostsCommentsController } from "./controllers/discussionBoard/moderator/posts/comments/DiscussionboardModeratorPostsCommentsController";
import { DiscussionboardPostsCommentsController } from "./controllers/discussionBoard/posts/comments/DiscussionboardPostsCommentsController";
import { DiscussionboardMemberPostsAttachmentsController } from "./controllers/discussionBoard/member/posts/attachments/DiscussionboardMemberPostsAttachmentsController";
import { DiscussionboardMemberCommentsController } from "./controllers/discussionBoard/member/comments/DiscussionboardMemberCommentsController";
import { DiscussionboardMemberCommentsAttachmentsController } from "./controllers/discussionBoard/member/comments/attachments/DiscussionboardMemberCommentsAttachmentsController";
import { DiscussionboardModeratorContentreportsController } from "./controllers/discussionBoard/moderator/contentReports/DiscussionboardModeratorContentreportsController";
import { DiscussionboardMemberContentreportsController } from "./controllers/discussionBoard/member/contentReports/DiscussionboardMemberContentreportsController";
import { DiscussionboardModeratorModerationactionsController } from "./controllers/discussionBoard/moderator/moderationActions/DiscussionboardModeratorModerationactionsController";
import { DiscussionboardModeratorModerationqueuesController } from "./controllers/discussionBoard/moderator/moderationQueues/DiscussionboardModeratorModerationqueuesController";
import { DiscussionboardMemberNotificationpreferencesController } from "./controllers/discussionBoard/member/notificationPreferences/DiscussionboardMemberNotificationpreferencesController";
import { DiscussionboardMemberNotificationsController } from "./controllers/discussionBoard/member/notifications/DiscussionboardMemberNotificationsController";
import { DiscussionboardModeratorPostsViewsController } from "./controllers/discussionBoard/moderator/posts/views/DiscussionboardModeratorPostsViewsController";
import { DiscussionboardModeratorPostsLikesController } from "./controllers/discussionBoard/moderator/posts/likes/DiscussionboardModeratorPostsLikesController";
import { DiscussionboardMemberPostsLikesController } from "./controllers/discussionBoard/member/posts/likes/DiscussionboardMemberPostsLikesController";
import { MembersPostsLikesController } from "./controllers/members/posts/likes/MembersPostsLikesController";
import { DiscussionboardMemberCommentsLikesController } from "./controllers/discussionBoard/member/comments/likes/DiscussionboardMemberCommentsLikesController";
import { DiscussionboardMemberMembersBookmarksController } from "./controllers/discussionBoard/member/members/bookmarks/DiscussionboardMemberMembersBookmarksController";
import { DiscussionboardModeratorAnalyticsPostsController } from "./controllers/discussionBoard/moderator/analytics/posts/DiscussionboardModeratorAnalyticsPostsController";
import { DiscussionboardModeratorDashboardPostsoverviewController } from "./controllers/discussionBoard/moderator/dashboard/postsOverview/DiscussionboardModeratorDashboardPostsoverviewController";
import { DiscussionboardSearchPostsController } from "./controllers/discussionBoard/search/posts/DiscussionboardSearchPostsController";
import { DiscussionboardModeratorStatisticsPostsbychannelController } from "./controllers/discussionBoard/moderator/statistics/postsByChannel/DiscussionboardModeratorStatisticsPostsbychannelController";
import { Discussion_boardSearchPostsController } from "./controllers/discussion-board/search/posts/Discussion_boardSearchPostsController";
import { Discussion_boardModeratorStatisticsPosts_by_channelController } from "./controllers/discussion-board/moderator/statistics/posts-by-channel/Discussion_boardModeratorStatisticsPosts_by_channelController";
import { DiscussionboardModeratorStatisticsPostsbystatusController } from "./controllers/discussionBoard/moderator/statistics/postsByStatus/DiscussionboardModeratorStatisticsPostsbystatusController";
import { DiscussionboardModeratorModerationDashboardController } from "./controllers/discussionBoard/moderator/moderation/dashboard/DiscussionboardModeratorModerationDashboardController";
import { DiscussionboardModeratorModerationStatisticsController } from "./controllers/discussionBoard/moderator/moderation/statistics/DiscussionboardModeratorModerationStatisticsController";

@Module({
  controllers: [
    AuthGuestController,
    AuthMemberController,
    AuthModeratorController,
    DiscussionboardChannelsController,
    DiscussionboardModeratorChannelsController,
    DiscussionboardChannelsSectionsController,
    DiscussionboardModeratorChannelsSectionsController,
    DiscussionboardChannelsPostsController,
    DiscussionboardModeratorConfigurationsController,
    PostsController,
    DiscussionboardConfigurationsController,
    DiscussionboardModeratorGuestsController,
    DiscussionboardModeratorMembersController,
    DiscussionboardMemberMembersController,
    DiscussionboardModeratorMembersSessionsController,
    DiscussionboardMemberMembersSessionsController,
    DiscussionboardMembersSessionsController,
    DiscussionboardModeratorModeratorsController,
    DiscussionboardModeratorModeratorsSessionsController,
    DiscussionboardMemberPostsController,
    DiscussionboardModeratorPostsController,
    DiscussionboardMemberPostsCommentsController,
    DiscussionboardModeratorPostsCommentsController,
    DiscussionboardPostsCommentsController,
    DiscussionboardMemberPostsAttachmentsController,
    DiscussionboardMemberCommentsController,
    DiscussionboardMemberCommentsAttachmentsController,
    DiscussionboardModeratorContentreportsController,
    DiscussionboardMemberContentreportsController,
    DiscussionboardModeratorModerationactionsController,
    DiscussionboardModeratorModerationqueuesController,
    DiscussionboardMemberNotificationpreferencesController,
    DiscussionboardMemberNotificationsController,
    DiscussionboardModeratorPostsViewsController,
    DiscussionboardModeratorPostsLikesController,
    DiscussionboardMemberPostsLikesController,
    MembersPostsLikesController,
    DiscussionboardMemberCommentsLikesController,
    DiscussionboardMemberMembersBookmarksController,
    DiscussionboardModeratorAnalyticsPostsController,
    DiscussionboardModeratorDashboardPostsoverviewController,
    DiscussionboardSearchPostsController,
    DiscussionboardModeratorStatisticsPostsbychannelController,
    Discussion_boardSearchPostsController,
    Discussion_boardModeratorStatisticsPosts_by_channelController,
    DiscussionboardModeratorStatisticsPostsbystatusController,
    DiscussionboardModeratorModerationDashboardController,
    DiscussionboardModeratorModerationStatisticsController,
  ],
})
export class MyModule {}
