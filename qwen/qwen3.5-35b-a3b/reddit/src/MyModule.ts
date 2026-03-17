import { Module } from "@nestjs/common";

import { RedditcommunityAuthGuestController } from "./controllers/redditCommunity/auth/guest/RedditcommunityAuthGuestController";
import { RedditcommunityAuthMemberController } from "./controllers/redditCommunity/auth/member/RedditcommunityAuthMemberController";
import { RedditcommunityCommentsDeletionsController } from "./controllers/redditCommunity/comments/deletions/RedditcommunityCommentsDeletionsController";
import { RedditcommunityCommentsSnapshotsController } from "./controllers/redditCommunity/comments/snapshots/RedditcommunityCommentsSnapshotsController";
import { RedditcommunityCommunitiesController } from "./controllers/redditCommunity/communities/RedditcommunityCommunitiesController";
import { RedditcommunityCommunitiesBansController } from "./controllers/redditCommunity/communities/bans/RedditcommunityCommunitiesBansController";
import { RedditcommunityCommunitiesFeedController } from "./controllers/redditCommunity/communities/feed/RedditcommunityCommunitiesFeedController";
import { RedditcommunityCommunitiesModeratorsController } from "./controllers/redditCommunity/communities/moderators/RedditcommunityCommunitiesModeratorsController";
import { RedditcommunityFilesController } from "./controllers/redditCommunity/files/RedditcommunityFilesController";
import { RedditcommunityFilesThumbnailsController } from "./controllers/redditCommunity/files/thumbnails/RedditcommunityFilesThumbnailsController";
import { RedditcommunityGuestPopularFeedController } from "./controllers/redditCommunity/guest/popular/feed/RedditcommunityGuestPopularFeedController";
import { RedditcommunityGuestUsersCommentsController } from "./controllers/redditCommunity/guest/users/comments/RedditcommunityGuestUsersCommentsController";
import { RedditcommunityGuestUsersPostsController } from "./controllers/redditCommunity/guest/users/posts/RedditcommunityGuestUsersPostsController";
import { RedditcommunityGuestUsersProfileController } from "./controllers/redditCommunity/guest/users/profile/RedditcommunityGuestUsersProfileController";
import { RedditcommunityMemberCommentsController } from "./controllers/redditCommunity/member/comments/RedditcommunityMemberCommentsController";
import { RedditcommunityMemberFilesController } from "./controllers/redditCommunity/member/files/RedditcommunityMemberFilesController";
import { RedditcommunityMemberFilesAccess_logsController } from "./controllers/redditCommunity/member/files/access-logs/RedditcommunityMemberFilesAccess_logsController";
import { RedditcommunityMemberFilesCdn_logsController } from "./controllers/redditCommunity/member/files/cdn-logs/RedditcommunityMemberFilesCdn_logsController";
import { RedditcommunityMemberFilesSnapshotsController } from "./controllers/redditCommunity/member/files/snapshots/RedditcommunityMemberFilesSnapshotsController";
import { RedditcommunityMemberHome_feedController } from "./controllers/redditCommunity/member/home-feed/RedditcommunityMemberHome_feedController";
import { RedditcommunityMemberHomeFeedController } from "./controllers/redditCommunity/member/home/feed/RedditcommunityMemberHomeFeedController";
import { RedditcommunityMemberKarma_snapshotsController } from "./controllers/redditCommunity/member/karma-snapshots/RedditcommunityMemberKarma_snapshotsController";
import { RedditcommunityMemberModerationReportsController } from "./controllers/redditCommunity/member/moderation/reports/RedditcommunityMemberModerationReportsController";
import { RedditcommunityMemberPopularFeedController } from "./controllers/redditCommunity/member/popular/feed/RedditcommunityMemberPopularFeedController";
import { RedditcommunityMemberPostsController } from "./controllers/redditCommunity/member/posts/RedditcommunityMemberPostsController";
import { RedditcommunityMemberPostsCommentsController } from "./controllers/redditCommunity/member/posts/comments/RedditcommunityMemberPostsCommentsController";
import { RedditcommunityMemberProfileController } from "./controllers/redditCommunity/member/profile/RedditcommunityMemberProfileController";
import { RedditcommunityMemberReportsController } from "./controllers/redditCommunity/member/reports/RedditcommunityMemberReportsController";
import { RedditcommunityMemberSessionsController } from "./controllers/redditCommunity/member/sessions/RedditcommunityMemberSessionsController";
import { RedditcommunityMemberSubscriptionsController } from "./controllers/redditCommunity/member/subscriptions/RedditcommunityMemberSubscriptionsController";
import { RedditcommunityMemberUsersCommentsController } from "./controllers/redditCommunity/member/users/comments/RedditcommunityMemberUsersCommentsController";
import { RedditcommunityMemberUsersPostsController } from "./controllers/redditCommunity/member/users/posts/RedditcommunityMemberUsersPostsController";
import { RedditcommunityMemberUsersProfileController } from "./controllers/redditCommunity/member/users/profile/RedditcommunityMemberUsersProfileController";
import { RedditcommunityMemberVotesController } from "./controllers/redditCommunity/member/votes/RedditcommunityMemberVotesController";
import { RedditcommunityMembersController } from "./controllers/redditCommunity/members/RedditcommunityMembersController";
import { RedditcommunityMembersKarmaController } from "./controllers/redditCommunity/members/karma/RedditcommunityMembersKarmaController";
import { RedditcommunityMembersProfileController } from "./controllers/redditCommunity/members/profile/RedditcommunityMembersProfileController";
import { RedditcommunityPopular_feedController } from "./controllers/redditCommunity/popular-feed/RedditcommunityPopular_feedController";
import { RedditcommunityPostsController } from "./controllers/redditCommunity/posts/RedditcommunityPostsController";
import { RedditcommunityPostsSnapshotsController } from "./controllers/redditCommunity/posts/snapshots/RedditcommunityPostsSnapshotsController";
import { RedditcommunityRate_limit_countersController } from "./controllers/redditCommunity/rate-limit-counters/RedditcommunityRate_limit_countersController";
import { RedditcommunitySystem_logsController } from "./controllers/redditCommunity/system-logs/RedditcommunitySystem_logsController";
import { RedditcommunitySystem_settingsController } from "./controllers/redditCommunity/system-settings/RedditcommunitySystem_settingsController";

@Module({
  controllers: [
    RedditcommunityAuthGuestController,
    RedditcommunityAuthMemberController,
    RedditcommunityMemberProfileController,
    RedditcommunityMemberSessionsController,
    RedditcommunityMembersController,
    RedditcommunityMembersProfileController,
    RedditcommunityMembersKarmaController,
    RedditcommunityCommunitiesController,
    RedditcommunityMemberSubscriptionsController,
    RedditcommunityCommunitiesModeratorsController,
    RedditcommunityCommunitiesBansController,
    RedditcommunityPostsController,
    RedditcommunityMemberPostsController,
    RedditcommunityPostsSnapshotsController,
    RedditcommunityMemberPostsCommentsController,
    RedditcommunityMemberCommentsController,
    RedditcommunityCommentsSnapshotsController,
    RedditcommunityCommentsDeletionsController,
    RedditcommunityMemberVotesController,
    RedditcommunityMemberKarma_snapshotsController,
    RedditcommunityMemberReportsController,
    RedditcommunityMemberHome_feedController,
    RedditcommunityPopular_feedController,
    RedditcommunityCommunitiesFeedController,
    RedditcommunityFilesController,
    RedditcommunityFilesThumbnailsController,
    RedditcommunityMemberFilesAccess_logsController,
    RedditcommunityMemberFilesCdn_logsController,
    RedditcommunityMemberFilesSnapshotsController,
    RedditcommunityMemberFilesController,
    RedditcommunitySystem_logsController,
    RedditcommunityRate_limit_countersController,
    RedditcommunitySystem_settingsController,
    RedditcommunityGuestUsersProfileController,
    RedditcommunityMemberUsersProfileController,
    RedditcommunityGuestUsersPostsController,
    RedditcommunityMemberUsersPostsController,
    RedditcommunityGuestUsersCommentsController,
    RedditcommunityMemberUsersCommentsController,
    RedditcommunityMemberModerationReportsController,
    RedditcommunityMemberHomeFeedController,
    RedditcommunityGuestPopularFeedController,
    RedditcommunityMemberPopularFeedController,
  ],
})
export class MyModule {}
