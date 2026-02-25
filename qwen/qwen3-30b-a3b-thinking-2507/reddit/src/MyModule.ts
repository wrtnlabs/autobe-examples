import { Module } from "@nestjs/common";

import { RedditAuthGuestController } from "./controllers/reddit/auth/guest/RedditAuthGuestController";
import { RedditAuthMemberController } from "./controllers/reddit/auth/member/RedditAuthMemberController";
import { RedditCommunitiesController } from "./controllers/reddit/communities/RedditCommunitiesController";
import { RedditFeedsController } from "./controllers/reddit/feeds/RedditFeedsController";
import { RedditGuestGuestsController } from "./controllers/reddit/guest/guests/RedditGuestGuestsController";
import { RedditGuestSessionsController } from "./controllers/reddit/guest/sessions/RedditGuestSessionsController";
import { RedditMemberCommentsController } from "./controllers/reddit/member/comments/RedditMemberCommentsController";
import { RedditMemberCommentsRepliesController } from "./controllers/reddit/member/comments/replies/RedditMemberCommentsRepliesController";
import { RedditMemberCommentsSnapshotsController } from "./controllers/reddit/member/comments/snapshots/RedditMemberCommentsSnapshotsController";
import { RedditMemberCommentsVotesController } from "./controllers/reddit/member/comments/votes/RedditMemberCommentsVotesController";
import { RedditMemberCommunitiesController } from "./controllers/reddit/member/communities/RedditMemberCommunitiesController";
import { RedditMemberCommunitiesBansController } from "./controllers/reddit/member/communities/bans/RedditMemberCommunitiesBansController";
import { RedditMemberCommunitiesPostsController } from "./controllers/reddit/member/communities/posts/RedditMemberCommunitiesPostsController";
import { RedditMemberCommunitiesReportsController } from "./controllers/reddit/member/communities/reports/RedditMemberCommunitiesReportsController";
import { RedditMemberCommunitiesReportsPendingController } from "./controllers/reddit/member/communities/reports/pending/RedditMemberCommunitiesReportsPendingController";
import { RedditMemberCommunitiesUnsubscribeController } from "./controllers/reddit/member/communities/unsubscribe/RedditMemberCommunitiesUnsubscribeController";
import { RedditMemberConfirm_deletionController } from "./controllers/reddit/member/confirm-deletion/RedditMemberConfirm_deletionController";
import { RedditMemberEmail_verificationsController } from "./controllers/reddit/member/email-verifications/RedditMemberEmail_verificationsController";
import { RedditMemberMembersController } from "./controllers/reddit/member/members/RedditMemberMembersController";
import { RedditMemberModeration_logsController } from "./controllers/reddit/member/moderation-logs/RedditMemberModeration_logsController";
import { RedditMemberPassword_resetsController } from "./controllers/reddit/member/password-resets/RedditMemberPassword_resetsController";
import { RedditMemberPostsController } from "./controllers/reddit/member/posts/RedditMemberPostsController";
import { RedditMemberPostsCommentsController } from "./controllers/reddit/member/posts/comments/RedditMemberPostsCommentsController";
import { RedditMemberPreferencesController } from "./controllers/reddit/member/preferences/RedditMemberPreferencesController";
import { RedditMemberProfileController } from "./controllers/reddit/member/profile/RedditMemberProfileController";
import { RedditMemberReportsController } from "./controllers/reddit/member/reports/RedditMemberReportsController";
import { RedditMemberReportsResolutionsController } from "./controllers/reddit/member/reports/resolutions/RedditMemberReportsResolutionsController";
import { RedditMemberSnapshotsController } from "./controllers/reddit/member/snapshots/RedditMemberSnapshotsController";
import { RedditMemberSubscriptionsController } from "./controllers/reddit/member/subscriptions/RedditMemberSubscriptionsController";
import { RedditPostsController } from "./controllers/reddit/posts/RedditPostsController";
import { RedditProfilesController } from "./controllers/reddit/profiles/RedditProfilesController";
import { RedditSearchPostsController } from "./controllers/reddit/search/posts/RedditSearchPostsController";
import { RedditSort_optionsController } from "./controllers/reddit/sort-options/RedditSort_optionsController";

@Module({
  controllers: [
    RedditAuthGuestController,
    RedditAuthMemberController,
    RedditGuestSessionsController,
    RedditGuestGuestsController,
    RedditMemberMembersController,
    RedditMemberProfileController,
    RedditMemberPassword_resetsController,
    RedditMemberEmail_verificationsController,
    RedditProfilesController,
    RedditMemberSnapshotsController,
    RedditCommunitiesController,
    RedditMemberCommunitiesController,
    RedditMemberCommunitiesUnsubscribeController,
    RedditMemberCommunitiesPostsController,
    RedditPostsController,
    RedditMemberPostsController,
    RedditMemberPostsCommentsController,
    RedditMemberCommentsRepliesController,
    RedditMemberCommentsController,
    RedditMemberCommentsVotesController,
    RedditMemberCommentsSnapshotsController,
    RedditMemberCommunitiesBansController,
    RedditMemberModeration_logsController,
    RedditMemberReportsController,
    RedditMemberReportsResolutionsController,
    RedditMemberCommunitiesReportsController,
    RedditFeedsController,
    RedditSort_optionsController,
    RedditMemberPreferencesController,
    RedditMemberConfirm_deletionController,
    RedditMemberSubscriptionsController,
    RedditSearchPostsController,
    RedditMemberCommunitiesReportsPendingController,
  ],
})
export class MyModule {}
