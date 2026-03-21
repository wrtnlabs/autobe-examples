import { Module } from "@nestjs/common";

import { RedditcloneAuthGuestController } from "./controllers/redditClone/auth/guest/RedditcloneAuthGuestController";
import { RedditcloneAuthMemberController } from "./controllers/redditClone/auth/member/RedditcloneAuthMemberController";
import { RedditcloneCommentsController } from "./controllers/redditClone/comments/RedditcloneCommentsController";
import { RedditcloneCommunitiesController } from "./controllers/redditClone/communities/RedditcloneCommunitiesController";
import { RedditcloneCommunitiesIconsController } from "./controllers/redditClone/communities/icons/RedditcloneCommunitiesIconsController";
import { RedditcloneCommunitiesModeratorsController } from "./controllers/redditClone/communities/moderators/RedditcloneCommunitiesModeratorsController";
import { RedditcloneFile_associationsController } from "./controllers/redditClone/file-associations/RedditcloneFile_associationsController";
import { RedditcloneFilesController } from "./controllers/redditClone/files/RedditcloneFilesController";
import { RedditcloneFilesScansController } from "./controllers/redditClone/files/scans/RedditcloneFilesScansController";
import { RedditcloneFilesThumbnailsController } from "./controllers/redditClone/files/thumbnails/RedditcloneFilesThumbnailsController";
import { RedditcloneGuestCommunitiesPostsController } from "./controllers/redditClone/guest/communities/posts/RedditcloneGuestCommunitiesPostsController";
import { RedditcloneGuestPostsCommentsController } from "./controllers/redditClone/guest/posts/comments/RedditcloneGuestPostsCommentsController";
import { RedditcloneGuestPostsPopularController } from "./controllers/redditClone/guest/posts/popular/RedditcloneGuestPostsPopularController";
import { RedditcloneGuestUsersCommentsController } from "./controllers/redditClone/guest/users/comments/RedditcloneGuestUsersCommentsController";
import { RedditcloneGuestUsersPostsController } from "./controllers/redditClone/guest/users/posts/RedditcloneGuestUsersPostsController";
import { RedditcloneMemberCommentsController } from "./controllers/redditClone/member/comments/RedditcloneMemberCommentsController";
import { RedditcloneMemberCommunitiesController } from "./controllers/redditClone/member/communities/RedditcloneMemberCommunitiesController";
import { RedditcloneMemberCommunitiesBansController } from "./controllers/redditClone/member/communities/bans/RedditcloneMemberCommunitiesBansController";
import { RedditcloneMemberCommunitiesIconsController } from "./controllers/redditClone/member/communities/icons/RedditcloneMemberCommunitiesIconsController";
import { RedditcloneMemberCommunitiesModeratorsController } from "./controllers/redditClone/member/communities/moderators/RedditcloneMemberCommunitiesModeratorsController";
import { RedditcloneMemberCommunitiesPostsController } from "./controllers/redditClone/member/communities/posts/RedditcloneMemberCommunitiesPostsController";
import { RedditcloneMemberCommunitiesReportsController } from "./controllers/redditClone/member/communities/reports/RedditcloneMemberCommunitiesReportsController";
import { RedditcloneMemberCommunitiesUsersController } from "./controllers/redditClone/member/communities/users/search/RedditcloneMemberCommunitiesUsersController";
import { RedditcloneMemberFile_associationsController } from "./controllers/redditClone/member/file-associations/RedditcloneMemberFile_associationsController";
import { RedditcloneMemberFilesController } from "./controllers/redditClone/member/files/RedditcloneMemberFilesController";
import { RedditcloneMemberMembersSessionsController } from "./controllers/redditClone/member/members/sessions/RedditcloneMemberMembersSessionsController";
import { RedditcloneMemberMembersSessionsAllController } from "./controllers/redditClone/member/members/sessions/all/RedditcloneMemberMembersSessionsAllController";
import { RedditcloneMemberPostsController } from "./controllers/redditClone/member/posts/RedditcloneMemberPostsController";
import { RedditcloneMemberPostsCommentsController } from "./controllers/redditClone/member/posts/comments/RedditcloneMemberPostsCommentsController";
import { RedditcloneMemberPostsHomeController } from "./controllers/redditClone/member/posts/home/RedditcloneMemberPostsHomeController";
import { RedditcloneMemberPostsPopularController } from "./controllers/redditClone/member/posts/popular/RedditcloneMemberPostsPopularController";
import { RedditcloneMemberPostsVotesController } from "./controllers/redditClone/member/posts/votes/RedditcloneMemberPostsVotesController";
import { RedditcloneMemberProfileController } from "./controllers/redditClone/member/profile/RedditcloneMemberProfileController";
import { RedditcloneMemberReportsController } from "./controllers/redditClone/member/reports/RedditcloneMemberReportsController";
import { RedditcloneMemberReportsHistoryController } from "./controllers/redditClone/member/reports/history/RedditcloneMemberReportsHistoryController";
import { RedditcloneMemberSessionsController } from "./controllers/redditClone/member/sessions/RedditcloneMemberSessionsController";
import { RedditcloneMemberSubscriptionsController } from "./controllers/redditClone/member/subscriptions/RedditcloneMemberSubscriptionsController";
import { RedditcloneMemberUsersCommentsController } from "./controllers/redditClone/member/users/comments/RedditcloneMemberUsersCommentsController";
import { RedditcloneMemberUsersPostsController } from "./controllers/redditClone/member/users/posts/RedditcloneMemberUsersPostsController";
import { RedditcloneMembersController } from "./controllers/redditClone/members/RedditcloneMembersController";
import { RedditclonePostsController } from "./controllers/redditClone/posts/RedditclonePostsController";
import { RedditclonePostsVotesController } from "./controllers/redditClone/posts/votes/RedditclonePostsVotesController";
import { RedditcloneUsersController } from "./controllers/redditClone/users/RedditcloneUsersController";

@Module({
  controllers: [
    RedditcloneAuthGuestController,
    RedditcloneAuthMemberController,
    RedditcloneMembersController,
    RedditcloneMemberProfileController,
    RedditcloneMemberSessionsController,
    RedditcloneUsersController,
    RedditcloneCommunitiesController,
    RedditcloneMemberCommunitiesController,
    RedditcloneCommunitiesIconsController,
    RedditcloneMemberCommunitiesIconsController,
    RedditcloneCommunitiesModeratorsController,
    RedditcloneMemberCommunitiesModeratorsController,
    RedditcloneMemberCommunitiesBansController,
    RedditcloneMemberCommunitiesReportsController,
    RedditcloneMemberSubscriptionsController,
    RedditclonePostsController,
    RedditcloneMemberPostsController,
    RedditclonePostsVotesController,
    RedditcloneMemberPostsVotesController,
    RedditcloneMemberPostsCommentsController,
    RedditcloneGuestPostsCommentsController,
    RedditcloneCommentsController,
    RedditcloneMemberCommentsController,
    RedditcloneMemberReportsController,
    RedditcloneFilesController,
    RedditcloneMemberFilesController,
    RedditcloneFilesScansController,
    RedditcloneFilesThumbnailsController,
    RedditcloneFile_associationsController,
    RedditcloneMemberFile_associationsController,
    RedditcloneMemberMembersSessionsController,
    RedditcloneMemberMembersSessionsAllController,
    RedditcloneGuestUsersPostsController,
    RedditcloneMemberUsersPostsController,
    RedditcloneGuestUsersCommentsController,
    RedditcloneMemberUsersCommentsController,
    RedditcloneMemberCommunitiesUsersController,
    RedditcloneGuestPostsPopularController,
    RedditcloneMemberPostsPopularController,
    RedditcloneMemberPostsHomeController,
    RedditcloneGuestCommunitiesPostsController,
    RedditcloneMemberCommunitiesPostsController,
    RedditcloneMemberReportsHistoryController,
  ],
})
export class MyModule {}
