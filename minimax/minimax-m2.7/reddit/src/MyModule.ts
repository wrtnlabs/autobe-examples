import { Module } from "@nestjs/common";

import { RedditcloneAuthGuestController } from "./controllers/redditClone/auth/guest/RedditcloneAuthGuestController";
import { RedditcloneAuthMemberController } from "./controllers/redditClone/auth/member/RedditcloneAuthMemberController";
import { RedditcloneCommunitiesController } from "./controllers/redditClone/communities/RedditcloneCommunitiesController";
import { RedditcloneCommunitiesDiscoverController } from "./controllers/redditClone/communities/discover/RedditcloneCommunitiesDiscoverController";
import { RedditcloneCommunitiesIconController } from "./controllers/redditClone/communities/icon/RedditcloneCommunitiesIconController";
import { RedditcloneFilesController } from "./controllers/redditClone/files/RedditcloneFilesController";
import { RedditcloneFilesScansController } from "./controllers/redditClone/files/scans/RedditcloneFilesScansController";
import { RedditcloneFilesThumbnailsController } from "./controllers/redditClone/files/thumbnails/RedditcloneFilesThumbnailsController";
import { RedditcloneGuestCommunitiesController } from "./controllers/redditClone/guest/communities/feed/RedditcloneGuestCommunitiesController";
import { RedditcloneGuestFeedPopularController } from "./controllers/redditClone/guest/feed/popular/RedditcloneGuestFeedPopularController";
import { RedditcloneGuestGuest_sessionsController } from "./controllers/redditClone/guest/guest-sessions/RedditcloneGuestGuest_sessionsController";
import { RedditcloneMemberAvatarsController } from "./controllers/redditClone/member/avatars/RedditcloneMemberAvatarsController";
import { RedditcloneMemberCommunitiesController } from "./controllers/redditClone/member/communities/RedditcloneMemberCommunitiesController";
import { RedditcloneMemberCommunitiesBansController } from "./controllers/redditClone/member/communities/bans/RedditcloneMemberCommunitiesBansController";
import { RedditcloneMemberCommunitiesIconController } from "./controllers/redditClone/member/communities/icon/RedditcloneMemberCommunitiesIconController";
import { RedditcloneMemberCommunitiesModerationController } from "./controllers/redditClone/member/communities/moderation/RedditcloneMemberCommunitiesModerationController";
import { RedditcloneMemberCommunitiesModeratorsController } from "./controllers/redditClone/member/communities/moderators/RedditcloneMemberCommunitiesModeratorsController";
import { RedditcloneMemberCommunitiesModeratorsSnapshotsController } from "./controllers/redditClone/member/communities/moderators/snapshots/RedditcloneMemberCommunitiesModeratorsSnapshotsController";
import { RedditcloneMemberCommunitiesReportsController } from "./controllers/redditClone/member/communities/reports/RedditcloneMemberCommunitiesReportsController";
import { RedditcloneMemberCommunitiesSubscribersController } from "./controllers/redditClone/member/communities/subscribers/RedditcloneMemberCommunitiesSubscribersController";
import { RedditcloneMemberFeedController } from "./controllers/redditClone/member/feed/home/RedditcloneMemberFeedController";
import { RedditcloneMemberFeedPopularController } from "./controllers/redditClone/member/feed/popular/RedditcloneMemberFeedPopularController";
import { RedditcloneMemberFilesController } from "./controllers/redditClone/member/files/RedditcloneMemberFilesController";
import { RedditcloneMemberPostsController } from "./controllers/redditClone/member/posts/RedditcloneMemberPostsController";
import { RedditcloneMemberPostsImageController } from "./controllers/redditClone/member/posts/image/RedditcloneMemberPostsImageController";
import { RedditcloneMemberPostsLinkController } from "./controllers/redditClone/member/posts/link/RedditcloneMemberPostsLinkController";
import { RedditcloneMemberPostsText_contentController } from "./controllers/redditClone/member/posts/text-content/RedditcloneMemberPostsText_contentController";
import { RedditcloneMemberPostsVotesController } from "./controllers/redditClone/member/posts/votes/RedditcloneMemberPostsVotesController";
import { RedditcloneMemberProfileController } from "./controllers/redditClone/member/profile/RedditcloneMemberProfileController";
import { RedditcloneMemberRedditcloneCommentsRepliesController } from "./controllers/redditClone/member/redditClone/comments/replies/RedditcloneMemberRedditcloneCommentsRepliesController";
import { RedditcloneMemberRedditcloneCommentsVotesController } from "./controllers/redditClone/member/redditClone/comments/votes/RedditcloneMemberRedditcloneCommentsVotesController";
import { RedditcloneMemberRedditclonePostsCommentsController } from "./controllers/redditClone/member/redditClone/posts/comments/RedditcloneMemberRedditclonePostsCommentsController";
import { RedditcloneMemberRedditclonePostsVotesController } from "./controllers/redditClone/member/redditClone/posts/votes/RedditcloneMemberRedditclonePostsVotesController";
import { RedditcloneMemberSessionsController } from "./controllers/redditClone/member/sessions/RedditcloneMemberSessionsController";
import { RedditcloneMemberSubscriptionsController } from "./controllers/redditClone/member/subscriptions/RedditcloneMemberSubscriptionsController";
import { RedditcloneMembersController } from "./controllers/redditClone/members/RedditcloneMembersController";
import { RedditclonePostsController } from "./controllers/redditClone/posts/RedditclonePostsController";
import { RedditclonePostsImageController } from "./controllers/redditClone/posts/image/RedditclonePostsImageController";
import { RedditclonePostsLinkController } from "./controllers/redditClone/posts/link/RedditclonePostsLinkController";
import { RedditclonePostsText_contentController } from "./controllers/redditClone/posts/text-content/RedditclonePostsText_contentController";
import { RedditclonePostsVotesController } from "./controllers/redditClone/posts/votes/RedditclonePostsVotesController";
import { RedditcloneProfilesController } from "./controllers/redditClone/profiles/RedditcloneProfilesController";
import { RedditcloneRedditcloneCommentsRepliesController } from "./controllers/redditClone/redditClone/comments/replies/RedditcloneRedditcloneCommentsRepliesController";
import { RedditcloneRedditclonePostsCommentsController } from "./controllers/redditClone/redditClone/posts/comments/RedditcloneRedditclonePostsCommentsController";
import { RedditcloneRedditclonePostsVotesController } from "./controllers/redditClone/redditClone/posts/votes/RedditcloneRedditclonePostsVotesController";
import { RedditcloneUsersKarmaController } from "./controllers/redditClone/users/karma/RedditcloneUsersKarmaController";
import { RedditcloneUsersProfileController } from "./controllers/redditClone/users/profile/RedditcloneUsersProfileController";

@Module({
  controllers: [
    RedditcloneAuthGuestController,
    RedditcloneAuthMemberController,
    RedditcloneMembersController,
    RedditcloneMemberProfileController,
    RedditcloneMemberSessionsController,
    RedditcloneGuestGuest_sessionsController,
    RedditcloneUsersProfileController,
    RedditcloneProfilesController,
    RedditcloneUsersKarmaController,
    RedditcloneCommunitiesController,
    RedditcloneMemberCommunitiesController,
    RedditcloneCommunitiesIconController,
    RedditcloneMemberCommunitiesIconController,
    RedditcloneMemberSubscriptionsController,
    RedditcloneMemberCommunitiesSubscribersController,
    RedditclonePostsController,
    RedditcloneMemberPostsController,
    RedditclonePostsText_contentController,
    RedditcloneMemberPostsText_contentController,
    RedditclonePostsLinkController,
    RedditcloneMemberPostsLinkController,
    RedditclonePostsImageController,
    RedditcloneMemberPostsImageController,
    RedditclonePostsVotesController,
    RedditcloneMemberPostsVotesController,
    RedditcloneRedditclonePostsCommentsController,
    RedditcloneMemberRedditclonePostsCommentsController,
    RedditcloneRedditcloneCommentsRepliesController,
    RedditcloneMemberRedditcloneCommentsRepliesController,
    RedditcloneRedditclonePostsVotesController,
    RedditcloneMemberRedditclonePostsVotesController,
    RedditcloneMemberCommunitiesModeratorsController,
    RedditcloneMemberCommunitiesModeratorsSnapshotsController,
    RedditcloneMemberCommunitiesBansController,
    RedditcloneMemberCommunitiesReportsController,
    RedditcloneFilesController,
    RedditcloneMemberFilesController,
    RedditcloneFilesThumbnailsController,
    RedditcloneFilesScansController,
    RedditcloneCommunitiesDiscoverController,
    RedditcloneMemberFeedController,
    RedditcloneGuestFeedPopularController,
    RedditcloneMemberFeedPopularController,
    RedditcloneGuestCommunitiesController,
    RedditcloneMemberRedditcloneCommentsVotesController,
    RedditcloneMemberCommunitiesModerationController,
    RedditcloneMemberAvatarsController,
  ],
})
export class MyModule {}
