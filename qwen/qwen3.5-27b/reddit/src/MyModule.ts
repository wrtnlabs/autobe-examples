import { Module } from "@nestjs/common";

import { RedditcloneAuthGuestController } from "./controllers/redditClone/auth/guest/RedditcloneAuthGuestController";
import { RedditcloneAuthMemberController } from "./controllers/redditClone/auth/member/RedditcloneAuthMemberController";
import { RedditcloneAuthModeratorController } from "./controllers/redditClone/auth/moderator/RedditcloneAuthModeratorController";
import { RedditcloneCommunitiesController } from "./controllers/redditClone/communities/RedditcloneCommunitiesController";
import { RedditcloneCommunitiesFeedsController } from "./controllers/redditClone/communities/feeds/RedditcloneCommunitiesFeedsController";
import { RedditcloneCommunitiesSubscriptionsController } from "./controllers/redditClone/communities/subscriptions/RedditcloneCommunitiesSubscriptionsController";
import { RedditcloneFeedsPopularController } from "./controllers/redditClone/feeds/popular/RedditcloneFeedsPopularController";
import { RedditcloneGuestGuestSessionsController } from "./controllers/redditClone/guest/guest/sessions/RedditcloneGuestGuestSessionsController";
import { RedditcloneGuestPostsCommentsVotesController } from "./controllers/redditClone/guest/posts/comments/votes/RedditcloneGuestPostsCommentsVotesController";
import { RedditcloneGuestsController } from "./controllers/redditClone/guests/RedditcloneGuestsController";
import { RedditcloneMemberCommunitiesSubscriptionsController } from "./controllers/redditClone/member/communities/subscriptions/RedditcloneMemberCommunitiesSubscriptionsController";
import { RedditcloneMemberFeedsHomeController } from "./controllers/redditClone/member/feeds/home/RedditcloneMemberFeedsHomeController";
import { RedditcloneMemberMemberPassword_resetsController } from "./controllers/redditClone/member/member/password-resets/RedditcloneMemberMemberPassword_resetsController";
import { RedditcloneMemberMemberSessionsController } from "./controllers/redditClone/member/member/sessions/RedditcloneMemberMemberSessionsController";
import { RedditcloneMemberPostsController } from "./controllers/redditClone/member/posts/RedditcloneMemberPostsController";
import { RedditcloneMemberPostsCommentsController } from "./controllers/redditClone/member/posts/comments/RedditcloneMemberPostsCommentsController";
import { RedditcloneMemberPostsCommentsVotesController } from "./controllers/redditClone/member/posts/comments/votes/RedditcloneMemberPostsCommentsVotesController";
import { RedditcloneMemberPostsVotesController } from "./controllers/redditClone/member/posts/votes/RedditcloneMemberPostsVotesController";
import { RedditcloneMemberProfileController } from "./controllers/redditClone/member/profile/RedditcloneMemberProfileController";
import { RedditcloneMemberReportsController } from "./controllers/redditClone/member/reports/RedditcloneMemberReportsController";
import { RedditcloneMemberSubscriptionsController } from "./controllers/redditClone/member/subscriptions/RedditcloneMemberSubscriptionsController";
import { RedditcloneMembersController } from "./controllers/redditClone/members/RedditcloneMembersController";
import { RedditcloneModeratorCommunitiesBansController } from "./controllers/redditClone/moderator/communities/bans/RedditcloneModeratorCommunitiesBansController";
import { RedditcloneModeratorCommunitiesModeratorsController } from "./controllers/redditClone/moderator/communities/moderators/RedditcloneModeratorCommunitiesModeratorsController";
import { RedditcloneModeratorModeratorPassword_resetsController } from "./controllers/redditClone/moderator/moderator/password-resets/RedditcloneModeratorModeratorPassword_resetsController";
import { RedditcloneModeratorModeratorSessionsController } from "./controllers/redditClone/moderator/moderator/sessions/RedditcloneModeratorModeratorSessionsController";
import { RedditcloneModeratorPostsCommentsController } from "./controllers/redditClone/moderator/posts/comments/RedditcloneModeratorPostsCommentsController";
import { RedditcloneModeratorReportsController } from "./controllers/redditClone/moderator/reports/RedditcloneModeratorReportsController";
import { RedditcloneModeratorsController } from "./controllers/redditClone/moderators/RedditcloneModeratorsController";
import { RedditclonePostsController } from "./controllers/redditClone/posts/RedditclonePostsController";
import { RedditclonePostsCommentsController } from "./controllers/redditClone/posts/comments/RedditclonePostsCommentsController";
import { RedditclonePostsCommentsSnapshotsController } from "./controllers/redditClone/posts/comments/snapshots/RedditclonePostsCommentsSnapshotsController";
import { RedditclonePostsCommentsVotesController } from "./controllers/redditClone/posts/comments/votes/RedditclonePostsCommentsVotesController";
import { RedditclonePostsSnapshotsController } from "./controllers/redditClone/posts/snapshots/RedditclonePostsSnapshotsController";
import { RedditclonePostsVotesController } from "./controllers/redditClone/posts/votes/RedditclonePostsVotesController";
import { RedditcloneProfilesController } from "./controllers/redditClone/profiles/RedditcloneProfilesController";
import { RedditcloneProfilesCommentsController } from "./controllers/redditClone/profiles/comments/RedditcloneProfilesCommentsController";
import { RedditcloneProfilesPostsController } from "./controllers/redditClone/profiles/posts/RedditcloneProfilesPostsController";

@Module({
  controllers: [
    RedditcloneAuthGuestController,
    RedditcloneAuthMemberController,
    RedditcloneAuthModeratorController,
    RedditcloneGuestsController,
    RedditcloneGuestGuestSessionsController,
    RedditcloneMembersController,
    RedditcloneMemberProfileController,
    RedditcloneMemberMemberSessionsController,
    RedditcloneMemberMemberPassword_resetsController,
    RedditcloneModeratorsController,
    RedditcloneModeratorModeratorSessionsController,
    RedditcloneModeratorModeratorPassword_resetsController,
    RedditcloneProfilesController,
    RedditcloneProfilesPostsController,
    RedditcloneProfilesCommentsController,
    RedditcloneCommunitiesController,
    RedditcloneMemberSubscriptionsController,
    RedditcloneModeratorCommunitiesModeratorsController,
    RedditcloneModeratorCommunitiesBansController,
    RedditclonePostsController,
    RedditcloneMemberPostsController,
    RedditclonePostsVotesController,
    RedditcloneMemberPostsVotesController,
    RedditclonePostsSnapshotsController,
    RedditcloneCommunitiesSubscriptionsController,
    RedditcloneMemberCommunitiesSubscriptionsController,
    RedditclonePostsCommentsController,
    RedditcloneMemberPostsCommentsController,
    RedditcloneModeratorPostsCommentsController,
    RedditclonePostsCommentsVotesController,
    RedditcloneGuestPostsCommentsVotesController,
    RedditcloneMemberPostsCommentsVotesController,
    RedditclonePostsCommentsSnapshotsController,
    RedditcloneMemberReportsController,
    RedditcloneModeratorReportsController,
    RedditcloneMemberFeedsHomeController,
    RedditcloneFeedsPopularController,
    RedditcloneCommunitiesFeedsController,
  ],
})
export class MyModule {}
