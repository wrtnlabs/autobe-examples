import { Module } from "@nestjs/common";

import { CommunityAdminAdminsController } from "./controllers/community/admin/admins/CommunityAdminAdminsController";
import { CommunityAdminAnalyticsKarmasController } from "./controllers/community/admin/analytics/karmas/CommunityAdminAnalyticsKarmasController";
import { CommunityAdminAnalyticsReportsController } from "./controllers/community/admin/analytics/reports/CommunityAdminAnalyticsReportsController";
import { CommunityAdminCommunitiesBansController } from "./controllers/community/admin/communities/bans/CommunityAdminCommunitiesBansController";
import { CommunityAdminKarmasController } from "./controllers/community/admin/karmas/CommunityAdminKarmasController";
import { CommunityAdminMembersController } from "./controllers/community/admin/members/CommunityAdminMembersController";
import { CommunityAdminReportsController } from "./controllers/community/admin/reports/CommunityAdminReportsController";
import { CommunityAuthAdminController } from "./controllers/community/auth/admin/CommunityAuthAdminController";
import { CommunityAuthGuestController } from "./controllers/community/auth/guest/CommunityAuthGuestController";
import { CommunityAuthMemberController } from "./controllers/community/auth/member/CommunityAuthMemberController";
import { CommunityCommunitiesController } from "./controllers/community/communities/CommunityCommunitiesController";
import { CommunityMemberAnalyticsPostsController } from "./controllers/community/member/analytics/posts/CommunityMemberAnalyticsPostsController";
import { CommunityMemberCommunitiesController } from "./controllers/community/member/communities/CommunityMemberCommunitiesController";
import { CommunityMemberCommunitiesBansController } from "./controllers/community/member/communities/bans/CommunityMemberCommunitiesBansController";
import { CommunityMemberCommunitiesModeratorsController } from "./controllers/community/member/communities/moderators/CommunityMemberCommunitiesModeratorsController";
import { CommunityMemberCommunitiesPostsController } from "./controllers/community/member/communities/posts/CommunityMemberCommunitiesPostsController";
import { CommunityMemberPostsController } from "./controllers/community/member/posts/CommunityMemberPostsController";
import { CommunityMemberPostsCommentsController } from "./controllers/community/member/posts/comments/CommunityMemberPostsCommentsController";
import { CommunityMemberPostsVotesController } from "./controllers/community/member/posts/votes/CommunityMemberPostsVotesController";
import { CommunityMemberProfileController } from "./controllers/community/member/profile/CommunityMemberProfileController";
import { CommunityMemberReportsController } from "./controllers/community/member/reports/CommunityMemberReportsController";
import { CommunityMemberSessionsController } from "./controllers/community/member/sessions/CommunityMemberSessionsController";
import { CommunityPostsController } from "./controllers/community/posts/CommunityPostsController";
import { CommunityPostsCommentsController } from "./controllers/community/posts/comments/CommunityPostsCommentsController";

@Module({
  controllers: [
    CommunityAuthGuestController,
    CommunityAuthMemberController,
    CommunityAuthAdminController,
    CommunityAdminMembersController,
    CommunityMemberProfileController,
    CommunityAdminAdminsController,
    CommunityMemberSessionsController,
    CommunityCommunitiesController,
    CommunityMemberCommunitiesController,
    CommunityMemberCommunitiesModeratorsController,
    CommunityMemberCommunitiesPostsController,
    CommunityPostsController,
    CommunityMemberPostsController,
    CommunityMemberPostsCommentsController,
    CommunityPostsCommentsController,
    CommunityMemberPostsVotesController,
    CommunityAdminKarmasController,
    CommunityAdminReportsController,
    CommunityMemberCommunitiesBansController,
    CommunityAdminCommunitiesBansController,
    CommunityMemberReportsController,
    CommunityMemberAnalyticsPostsController,
    CommunityAdminAnalyticsKarmasController,
    CommunityAdminAnalyticsReportsController,
  ],
})
export class MyModule {}
