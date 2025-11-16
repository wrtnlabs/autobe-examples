import { Module } from "@nestjs/common";

import { AuthVisitorController } from "./controllers/auth/visitor/AuthVisitorController";
import { AuthMemberController } from "./controllers/auth/member/AuthMemberController";
import { AuthCommunitymoderatorController } from "./controllers/auth/communityModerator/AuthCommunitymoderatorController";
import { AuthPlatformmoderatorController } from "./controllers/auth/platformModerator/AuthPlatformmoderatorController";
import { RedditcommunityMemberCommunitiesController } from "./controllers/redditCommunity/member/communities/RedditcommunityMemberCommunitiesController";
import { RedditcommunityCommunitiesController } from "./controllers/redditCommunity/communities/RedditcommunityCommunitiesController";
import { RedditcommunityCommunitymoderatorCommunitiesController } from "./controllers/redditCommunity/communityModerator/communities/RedditcommunityCommunitymoderatorCommunitiesController";
import { RedditcommunityPlatformmoderatorCommunitiesController } from "./controllers/redditCommunity/platformModerator/communities/RedditcommunityPlatformmoderatorCommunitiesController";
import { RedditcommunityCommunitymoderatorCommunitiesRulesController } from "./controllers/redditCommunity/communityModerator/communities/rules/RedditcommunityCommunitymoderatorCommunitiesRulesController";
import { RedditcommunityPlatformmoderatorCommunitiesRulesController } from "./controllers/redditCommunity/platformModerator/communities/rules/RedditcommunityPlatformmoderatorCommunitiesRulesController";
import { RedditcommunityCommunitiesRulesController } from "./controllers/redditCommunity/communities/rules/RedditcommunityCommunitiesRulesController";
import { RedditcommunityMemberCommunitiesRulesController } from "./controllers/redditCommunity/member/communities/rules/RedditcommunityMemberCommunitiesRulesController";
import { RedditcommunityCommunitymoderatorCommunitiesMembershipsController } from "./controllers/redditCommunity/communityModerator/communities/memberships/RedditcommunityCommunitymoderatorCommunitiesMembershipsController";
import { RedditcommunityMemberCommunitiesSubscriptionsController } from "./controllers/redditCommunity/member/communities/subscriptions/RedditcommunityMemberCommunitiesSubscriptionsController";
import { RedditcommunityPostsController } from "./controllers/redditCommunity/posts/RedditcommunityPostsController";
import { RedditcommunityMemberPostsController } from "./controllers/redditCommunity/member/posts/RedditcommunityMemberPostsController";
import { RedditcommunityPosttypesController } from "./controllers/redditCommunity/postTypes/RedditcommunityPosttypesController";
import { RedditcommunityCommunitymoderatorCommentsController } from "./controllers/redditCommunity/communityModerator/comments/RedditcommunityCommunitymoderatorCommentsController";
import { RedditcommunityPlatformmoderatorCommentsController } from "./controllers/redditCommunity/platformModerator/comments/RedditcommunityPlatformmoderatorCommentsController";
import { RedditcommunityCommentsController } from "./controllers/redditCommunity/comments/RedditcommunityCommentsController";
import { RedditcommunityMemberCommentsController } from "./controllers/redditCommunity/member/comments/RedditcommunityMemberCommentsController";
import { RedditcommunityPostsCommentsController } from "./controllers/redditCommunity/posts/comments/RedditcommunityPostsCommentsController";
import { RedditcommunityMemberPostsCommentsController } from "./controllers/redditCommunity/member/posts/comments/RedditcommunityMemberPostsCommentsController";
import { RedditcommunityPlatformmoderatorContentreportsController } from "./controllers/redditCommunity/platformModerator/contentReports/RedditcommunityPlatformmoderatorContentreportsController";
import { RedditcommunityCommunitymoderatorContentreportsController } from "./controllers/redditCommunity/communityModerator/contentReports/RedditcommunityCommunitymoderatorContentreportsController";
import { RedditcommunityMemberContentreportsController } from "./controllers/redditCommunity/member/contentReports/RedditcommunityMemberContentreportsController";
import { RedditcommunityCommunitymoderatorModerationqueueController } from "./controllers/redditCommunity/communityModerator/moderationQueue/RedditcommunityCommunitymoderatorModerationqueueController";
import { RedditcommunityPlatformmoderatorModerationqueueController } from "./controllers/redditCommunity/platformModerator/moderationQueue/RedditcommunityPlatformmoderatorModerationqueueController";
import { RedditcommunityPlatformmoderatorAppealsController } from "./controllers/redditCommunity/platformModerator/appeals/RedditcommunityPlatformmoderatorAppealsController";
import { RedditcommunityMemberAppealsController } from "./controllers/redditCommunity/member/appeals/RedditcommunityMemberAppealsController";
import { RedditcommunityUserprofilesController } from "./controllers/redditCommunity/userProfiles/RedditcommunityUserprofilesController";
import { RedditcommunityMemberUserprofilesController } from "./controllers/redditCommunity/member/userProfiles/RedditcommunityMemberUserprofilesController";
import { RedditcommunityUsersController } from "./controllers/redditCommunity/users/profile/RedditcommunityUsersController";
import { RedditcommunitySupportSupportticketsController } from "./controllers/redditCommunity/support/supportTickets/RedditcommunitySupportSupportticketsController";
import { RedditcommunityMembersController } from "./controllers/redditCommunity/members/profile/RedditcommunityMembersController";
import { RedditcommunityPlatformmoderatorSupportSupportticketsController } from "./controllers/redditCommunity/platformModerator/support/supportTickets/RedditcommunityPlatformmoderatorSupportSupportticketsController";
import { RedditcommunityMemberSupportSupportticketsController } from "./controllers/redditCommunity/member/support/supportTickets/RedditcommunityMemberSupportSupportticketsController";

@Module({
  controllers: [
    AuthVisitorController,
    AuthMemberController,
    AuthCommunitymoderatorController,
    AuthPlatformmoderatorController,
    RedditcommunityMemberCommunitiesController,
    RedditcommunityCommunitiesController,
    RedditcommunityCommunitymoderatorCommunitiesController,
    RedditcommunityPlatformmoderatorCommunitiesController,
    RedditcommunityCommunitymoderatorCommunitiesRulesController,
    RedditcommunityPlatformmoderatorCommunitiesRulesController,
    RedditcommunityCommunitiesRulesController,
    RedditcommunityMemberCommunitiesRulesController,
    RedditcommunityCommunitymoderatorCommunitiesMembershipsController,
    RedditcommunityMemberCommunitiesSubscriptionsController,
    RedditcommunityPostsController,
    RedditcommunityMemberPostsController,
    RedditcommunityPosttypesController,
    RedditcommunityCommunitymoderatorCommentsController,
    RedditcommunityPlatformmoderatorCommentsController,
    RedditcommunityCommentsController,
    RedditcommunityMemberCommentsController,
    RedditcommunityPostsCommentsController,
    RedditcommunityMemberPostsCommentsController,
    RedditcommunityPlatformmoderatorContentreportsController,
    RedditcommunityCommunitymoderatorContentreportsController,
    RedditcommunityMemberContentreportsController,
    RedditcommunityCommunitymoderatorModerationqueueController,
    RedditcommunityPlatformmoderatorModerationqueueController,
    RedditcommunityPlatformmoderatorAppealsController,
    RedditcommunityMemberAppealsController,
    RedditcommunityUserprofilesController,
    RedditcommunityMemberUserprofilesController,
    RedditcommunityUsersController,
    RedditcommunitySupportSupportticketsController,
    RedditcommunityMembersController,
    RedditcommunityPlatformmoderatorSupportSupportticketsController,
    RedditcommunityMemberSupportSupportticketsController,
  ],
})
export class MyModule {}
