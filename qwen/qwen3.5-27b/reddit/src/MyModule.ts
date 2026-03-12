import { Module } from "@nestjs/common";

import { RedditcloneAdminAdminsController } from "./controllers/redditClone/admin/admins/RedditcloneAdminAdminsController";
import { RedditcloneAdminAnnouncementsController } from "./controllers/redditClone/admin/announcements/RedditcloneAdminAnnouncementsController";
import { RedditcloneAdminAudit_logsController } from "./controllers/redditClone/admin/audit-logs/RedditcloneAdminAudit_logsController";
import { RedditcloneAdminCommunitiesController } from "./controllers/redditClone/admin/communities/RedditcloneAdminCommunitiesController";
import { RedditcloneAdminReports_snapshotsController } from "./controllers/redditClone/admin/reports-snapshots/RedditcloneAdminReports_snapshotsController";
import { RedditcloneAdminReportsController } from "./controllers/redditClone/admin/reports/RedditcloneAdminReportsController";
import { RedditcloneAuthAdminController } from "./controllers/redditClone/auth/admin/RedditcloneAuthAdminController";
import { RedditcloneAuthGuestController } from "./controllers/redditClone/auth/guest/RedditcloneAuthGuestController";
import { RedditcloneAuthMemberController } from "./controllers/redditClone/auth/member/RedditcloneAuthMemberController";
import { RedditcloneBan_snapshotsController } from "./controllers/redditClone/ban-snapshots/RedditcloneBan_snapshotsController";
import { RedditcloneCommentsController } from "./controllers/redditClone/comments/RedditcloneCommentsController";
import { RedditcloneCommunitiesController } from "./controllers/redditClone/communities/RedditcloneCommunitiesController";
import { RedditcloneCommunitiesBansController } from "./controllers/redditClone/communities/bans/RedditcloneCommunitiesBansController";
import { RedditcloneGuestAnnouncementsController } from "./controllers/redditClone/guest/announcements/RedditcloneGuestAnnouncementsController";
import { RedditcloneGuestCommunitiesSearchController } from "./controllers/redditClone/guest/communities/search/RedditcloneGuestCommunitiesSearchController";
import { RedditcloneGuestSessionsController } from "./controllers/redditClone/guest/sessions/RedditcloneGuestSessionsController";
import { RedditcloneMemberAnnouncementsController } from "./controllers/redditClone/member/announcements/RedditcloneMemberAnnouncementsController";
import { RedditcloneMemberBlocksController } from "./controllers/redditClone/member/blocks/RedditcloneMemberBlocksController";
import { RedditcloneMemberCommentsController } from "./controllers/redditClone/member/comments/RedditcloneMemberCommentsController";
import { RedditcloneMemberCommunitiesController } from "./controllers/redditClone/member/communities/RedditcloneMemberCommunitiesController";
import { RedditcloneMemberCommunitiesBansController } from "./controllers/redditClone/member/communities/bans/RedditcloneMemberCommunitiesBansController";
import { RedditcloneMemberCommunitiesModeratorsController } from "./controllers/redditClone/member/communities/moderators/RedditcloneMemberCommunitiesModeratorsController";
import { RedditcloneMemberCommunitiesSearchController } from "./controllers/redditClone/member/communities/search/RedditcloneMemberCommunitiesSearchController";
import { RedditcloneMemberFeedController } from "./controllers/redditClone/member/feed/RedditcloneMemberFeedController";
import { RedditcloneMemberMeController } from "./controllers/redditClone/member/me/RedditcloneMemberMeController";
import { RedditcloneMemberMeCommentsController } from "./controllers/redditClone/member/me/comments/RedditcloneMemberMeCommentsController";
import { RedditcloneMemberMePostsController } from "./controllers/redditClone/member/me/posts/RedditcloneMemberMePostsController";
import { RedditcloneMemberPostsController } from "./controllers/redditClone/member/posts/RedditcloneMemberPostsController";
import { RedditcloneMemberPostsCommentsController } from "./controllers/redditClone/member/posts/comments/RedditcloneMemberPostsCommentsController";
import { RedditcloneMemberPostsComments_voteController } from "./controllers/redditClone/member/posts/comments/vote/RedditcloneMemberPostsComments_voteController";
import { RedditcloneMemberPostsImagesController } from "./controllers/redditClone/member/posts/images/RedditcloneMemberPostsImagesController";
import { RedditcloneMemberPosts_voteController } from "./controllers/redditClone/member/posts/vote/RedditcloneMemberPosts_voteController";
import { RedditcloneMemberProfileController } from "./controllers/redditClone/member/profile/RedditcloneMemberProfileController";
import { RedditcloneMemberReportsController } from "./controllers/redditClone/member/reports/RedditcloneMemberReportsController";
import { RedditcloneMembersController } from "./controllers/redditClone/members/RedditcloneMembersController";
import { RedditclonePost_snapshotsController } from "./controllers/redditClone/post-snapshots/RedditclonePost_snapshotsController";
import { RedditclonePostsController } from "./controllers/redditClone/posts/RedditclonePostsController";
import { RedditclonePostsCommentsController } from "./controllers/redditClone/posts/comments/RedditclonePostsCommentsController";
import { RedditclonePostsCommentsSnapshotsController } from "./controllers/redditClone/posts/comments/snapshots/RedditclonePostsCommentsSnapshotsController";
import { RedditclonePostsImagesController } from "./controllers/redditClone/posts/images/RedditclonePostsImagesController";
import { RedditcloneUsersController } from "./controllers/redditClone/users/RedditcloneUsersController";
import { RedditcloneUsersCommentsController } from "./controllers/redditClone/users/comments/RedditcloneUsersCommentsController";
import { RedditcloneUsersPostsController } from "./controllers/redditClone/users/posts/RedditcloneUsersPostsController";

@Module({
  controllers: [
    RedditcloneAuthGuestController,
    RedditcloneAuthMemberController,
    RedditcloneAuthAdminController,
    RedditcloneGuestSessionsController,
    RedditcloneMembersController,
    RedditcloneMemberProfileController,
    RedditcloneAdminAdminsController,
    RedditcloneAdminAudit_logsController,
    RedditclonePostsController,
    RedditcloneMemberPostsController,
    RedditclonePostsCommentsController,
    RedditcloneCommentsController,
    RedditcloneMemberPostsCommentsController,
    RedditcloneMemberCommentsController,
    RedditcloneCommunitiesController,
    RedditcloneMemberCommunitiesController,
    RedditcloneMemberCommunitiesModeratorsController,
    RedditclonePostsImagesController,
    RedditcloneMemberPostsImagesController,
    RedditclonePost_snapshotsController,
    RedditclonePostsCommentsSnapshotsController,
    RedditcloneMemberPosts_voteController,
    RedditcloneMemberPostsComments_voteController,
    RedditcloneCommunitiesBansController,
    RedditcloneMemberCommunitiesBansController,
    RedditcloneBan_snapshotsController,
    RedditcloneMemberReportsController,
    RedditcloneAdminReportsController,
    RedditcloneAdminReports_snapshotsController,
    RedditcloneMemberBlocksController,
    RedditcloneUsersController,
    RedditcloneMemberMeController,
    RedditcloneUsersPostsController,
    RedditcloneMemberMePostsController,
    RedditcloneUsersCommentsController,
    RedditcloneMemberMeCommentsController,
    RedditcloneGuestCommunitiesSearchController,
    RedditcloneMemberCommunitiesSearchController,
    RedditcloneAdminCommunitiesController,
    RedditcloneAdminAnnouncementsController,
    RedditcloneGuestAnnouncementsController,
    RedditcloneMemberAnnouncementsController,
    RedditcloneMemberFeedController,
  ],
})
export class MyModule {}
