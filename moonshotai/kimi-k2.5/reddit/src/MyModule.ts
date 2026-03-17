import { Module } from "@nestjs/common";

import { RedditlikeAttachment_referencesController } from "./controllers/redditLike/attachment-references/RedditlikeAttachment_referencesController";
import { RedditlikeAttachmentsController } from "./controllers/redditLike/attachments/RedditlikeAttachmentsController";
import { RedditlikeAttachmentsThumbnailsController } from "./controllers/redditLike/attachments/thumbnails/RedditlikeAttachmentsThumbnailsController";
import { RedditlikeAuthGuestController } from "./controllers/redditLike/auth/guest/RedditlikeAuthGuestController";
import { RedditlikeAuthMemberController } from "./controllers/redditLike/auth/member/RedditlikeAuthMemberController";
import { RedditlikeAuthModeratorController } from "./controllers/redditLike/auth/moderator/RedditlikeAuthModeratorController";
import { RedditlikeAuthOwnerController } from "./controllers/redditLike/auth/owner/RedditlikeAuthOwnerController";
import { RedditlikeCommentsSnapshotsController } from "./controllers/redditLike/comments/snapshots/RedditlikeCommentsSnapshotsController";
import { RedditlikeCommunitiesController } from "./controllers/redditLike/communities/RedditlikeCommunitiesController";
import { RedditlikeGuestAttachmentsAccessController } from "./controllers/redditLike/guest/attachments/access/RedditlikeGuestAttachmentsAccessController";
import { RedditlikeGuestFeedsPopularController } from "./controllers/redditLike/guest/feeds/popular/RedditlikeGuestFeedsPopularController";
import { RedditlikeGuestPostsCommentsSortedController } from "./controllers/redditLike/guest/posts/comments/sorted/RedditlikeGuestPostsCommentsSortedController";
import { RedditlikeGuestPostsCommentsController } from "./controllers/redditLike/guest/posts/comments/thread/RedditlikeGuestPostsCommentsController";
import { RedditlikeGuestSessionsController } from "./controllers/redditLike/guest/sessions/RedditlikeGuestSessionsController";
import { RedditlikeGuestSessionsMeController } from "./controllers/redditLike/guest/sessions/me/RedditlikeGuestSessionsMeController";
import { RedditlikeGuestsController } from "./controllers/redditLike/guests/RedditlikeGuestsController";
import { RedditlikeMemberAttachment_referencesController } from "./controllers/redditLike/member/attachment-references/RedditlikeMemberAttachment_referencesController";
import { RedditlikeMemberAttachmentsController } from "./controllers/redditLike/member/attachments/RedditlikeMemberAttachmentsController";
import { RedditlikeMemberAttachmentsAccessController } from "./controllers/redditLike/member/attachments/access/RedditlikeMemberAttachmentsAccessController";
import { RedditlikeMemberAttachmentsGenerate_thumbnailsController } from "./controllers/redditLike/member/attachments/generate-thumbnails/RedditlikeMemberAttachmentsGenerate_thumbnailsController";
import { RedditlikeMemberCommentsController } from "./controllers/redditLike/member/comments/RedditlikeMemberCommentsController";
import { RedditlikeMemberCommentsMy_voteController } from "./controllers/redditLike/member/comments/my-vote/RedditlikeMemberCommentsMy_voteController";
import { RedditlikeMemberCommentsVotesController } from "./controllers/redditLike/member/comments/votes/RedditlikeMemberCommentsVotesController";
import { RedditlikeMemberCommunitiesController } from "./controllers/redditLike/member/communities/RedditlikeMemberCommunitiesController";
import { RedditlikeMemberCommunitiesSubscriptionController } from "./controllers/redditLike/member/communities/subscription/RedditlikeMemberCommunitiesSubscriptionController";
import { RedditlikeMemberCommunitiesSubscriptionsController } from "./controllers/redditLike/member/communities/subscriptions/RedditlikeMemberCommunitiesSubscriptionsController";
import { RedditlikeMemberFeedsHomeController } from "./controllers/redditLike/member/feeds/home/RedditlikeMemberFeedsHomeController";
import { RedditlikeMemberFeedsPopularController } from "./controllers/redditLike/member/feeds/popular/RedditlikeMemberFeedsPopularController";
import { RedditlikeMemberMeController } from "./controllers/redditLike/member/me/RedditlikeMemberMeController";
import { RedditlikeMemberPassword_resetsController } from "./controllers/redditLike/member/password-resets/RedditlikeMemberPassword_resetsController";
import { RedditlikeMemberPostsController } from "./controllers/redditLike/member/posts/RedditlikeMemberPostsController";
import { RedditlikeMemberPostsCommentsController } from "./controllers/redditLike/member/posts/comments/RedditlikeMemberPostsCommentsController";
import { RedditlikeMemberPostsCommentsSortedController } from "./controllers/redditLike/member/posts/comments/sorted/RedditlikeMemberPostsCommentsSortedController";
import { RedditlikeMemberPostsMy_voteController } from "./controllers/redditLike/member/posts/my-vote/RedditlikeMemberPostsMy_voteController";
import { RedditlikeMemberPostsVotesController } from "./controllers/redditLike/member/posts/votes/RedditlikeMemberPostsVotesController";
import { RedditlikeMemberProfileController } from "./controllers/redditLike/member/profile/RedditlikeMemberProfileController";
import { RedditlikeMemberReportsController } from "./controllers/redditLike/member/reports/RedditlikeMemberReportsController";
import { RedditlikeMemberSessionsMeController } from "./controllers/redditLike/member/sessions/me/RedditlikeMemberSessionsMeController";
import { RedditlikeMemberSubscribed_communitiesController } from "./controllers/redditLike/member/subscribed-communities/RedditlikeMemberSubscribed_communitiesController";
import { RedditlikeMemberSubscriptionsController } from "./controllers/redditLike/member/subscriptions/RedditlikeMemberSubscriptionsController";
import { RedditlikeMembersController } from "./controllers/redditLike/members/RedditlikeMembersController";
import { RedditlikeModeratorAttachmentsAccess_logsController } from "./controllers/redditLike/moderator/attachments/access-logs/RedditlikeModeratorAttachmentsAccess_logsController";
import { RedditlikeModeratorAttachmentsAccessController } from "./controllers/redditLike/moderator/attachments/access/RedditlikeModeratorAttachmentsAccessController";
import { RedditlikeModeratorAttachmentsGenerate_thumbnailsController } from "./controllers/redditLike/moderator/attachments/generate-thumbnails/RedditlikeModeratorAttachmentsGenerate_thumbnailsController";
import { RedditlikeModeratorCommunitiesReportsPendingController } from "./controllers/redditLike/moderator/communities/reports/pending/RedditlikeModeratorCommunitiesReportsPendingController";
import { RedditlikeModeratorModeratorsController } from "./controllers/redditLike/moderator/moderators/RedditlikeModeratorModeratorsController";
import { RedditlikeModeratorPostsController } from "./controllers/redditLike/moderator/posts/RedditlikeModeratorPostsController";
import { RedditlikeModeratorPostsCommentsController } from "./controllers/redditLike/moderator/posts/comments/RedditlikeModeratorPostsCommentsController";
import { RedditlikeModeratorPostsCommentsSortedController } from "./controllers/redditLike/moderator/posts/comments/sorted/RedditlikeModeratorPostsCommentsSortedController";
import { RedditlikeModeratorReportsController } from "./controllers/redditLike/moderator/reports/RedditlikeModeratorReportsController";
import { RedditlikeModeratorReportsSnapshotsController } from "./controllers/redditLike/moderator/reports/snapshots/RedditlikeModeratorReportsSnapshotsController";
import { RedditlikeModeratorSessionsMeController } from "./controllers/redditLike/moderator/sessions/me/RedditlikeModeratorSessionsMeController";
import { RedditlikeModeratorsController } from "./controllers/redditLike/moderators/RedditlikeModeratorsController";
import { RedditlikeOwnerAttachmentsAccess_logsController } from "./controllers/redditLike/owner/attachments/access-logs/RedditlikeOwnerAttachmentsAccess_logsController";
import { RedditlikeOwnerAttachmentsAccessController } from "./controllers/redditLike/owner/attachments/access/RedditlikeOwnerAttachmentsAccessController";
import { RedditlikeOwnerAttachmentsBatch_cleanupController } from "./controllers/redditLike/owner/attachments/batch-cleanup/RedditlikeOwnerAttachmentsBatch_cleanupController";
import { RedditlikeOwnerAttachmentsGenerate_thumbnailsController } from "./controllers/redditLike/owner/attachments/generate-thumbnails/RedditlikeOwnerAttachmentsGenerate_thumbnailsController";
import { RedditlikeOwnerAudit_logsController } from "./controllers/redditLike/owner/audit-logs/RedditlikeOwnerAudit_logsController";
import { RedditlikeOwnerAudit_logsMy_activityController } from "./controllers/redditLike/owner/audit-logs/my-activity/RedditlikeOwnerAudit_logsMy_activityController";
import { RedditlikeOwnerCommunitiesController } from "./controllers/redditLike/owner/communities/RedditlikeOwnerCommunitiesController";
import { RedditlikeOwnerCommunitiesReportsPendingController } from "./controllers/redditLike/owner/communities/reports/pending/RedditlikeOwnerCommunitiesReportsPendingController";
import { RedditlikeOwnerModeratorsController } from "./controllers/redditLike/owner/moderators/RedditlikeOwnerModeratorsController";
import { RedditlikeOwnerPostsCommentsSortedController } from "./controllers/redditLike/owner/posts/comments/sorted/RedditlikeOwnerPostsCommentsSortedController";
import { RedditlikeOwnerPostsCommentsController } from "./controllers/redditLike/owner/posts/comments/thread/RedditlikeOwnerPostsCommentsController";
import { RedditlikeOwnerReportsController } from "./controllers/redditLike/owner/reports/RedditlikeOwnerReportsController";
import { RedditlikeOwnerSessionsMeController } from "./controllers/redditLike/owner/sessions/me/RedditlikeOwnerSessionsMeController";
import { RedditlikeOwnersController } from "./controllers/redditLike/owners/RedditlikeOwnersController";
import { RedditlikePostsController } from "./controllers/redditLike/posts/RedditlikePostsController";
import { RedditlikePostsCommentsController } from "./controllers/redditLike/posts/comments/RedditlikePostsCommentsController";
import { RedditlikePostsSnapshotsController } from "./controllers/redditLike/posts/snapshots/RedditlikePostsSnapshotsController";

@Module({
  controllers: [
    RedditlikeAuthGuestController,
    RedditlikeAuthMemberController,
    RedditlikeAuthModeratorController,
    RedditlikeAuthOwnerController,
    RedditlikeGuestsController,
    RedditlikeGuestSessionsController,
    RedditlikeMembersController,
    RedditlikeMemberProfileController,
    RedditlikeMemberPassword_resetsController,
    RedditlikeOwnersController,
    RedditlikeOwnerAudit_logsController,
    RedditlikeModeratorsController,
    RedditlikeOwnerModeratorsController,
    RedditlikeModeratorModeratorsController,
    RedditlikeAttachmentsController,
    RedditlikeMemberAttachmentsController,
    RedditlikeAttachmentsThumbnailsController,
    RedditlikeModeratorAttachmentsAccess_logsController,
    RedditlikeOwnerAttachmentsAccess_logsController,
    RedditlikeAttachment_referencesController,
    RedditlikeMemberAttachment_referencesController,
    RedditlikeCommunitiesController,
    RedditlikeMemberCommunitiesController,
    RedditlikeOwnerCommunitiesController,
    RedditlikeMemberSubscriptionsController,
    RedditlikeMemberCommunitiesSubscriptionsController,
    RedditlikePostsController,
    RedditlikeMemberPostsController,
    RedditlikeModeratorPostsController,
    RedditlikePostsSnapshotsController,
    RedditlikePostsCommentsController,
    RedditlikeMemberPostsCommentsController,
    RedditlikeModeratorPostsCommentsController,
    RedditlikeMemberCommentsController,
    RedditlikeCommentsSnapshotsController,
    RedditlikeMemberPostsVotesController,
    RedditlikeMemberPostsMy_voteController,
    RedditlikeMemberCommentsVotesController,
    RedditlikeMemberCommentsMy_voteController,
    RedditlikeMemberReportsController,
    RedditlikeModeratorReportsController,
    RedditlikeModeratorReportsSnapshotsController,
    RedditlikeMemberMeController,
    RedditlikeGuestSessionsMeController,
    RedditlikeMemberSessionsMeController,
    RedditlikeOwnerSessionsMeController,
    RedditlikeModeratorSessionsMeController,
    RedditlikeOwnerAudit_logsMy_activityController,
    RedditlikeMemberAttachmentsGenerate_thumbnailsController,
    RedditlikeModeratorAttachmentsGenerate_thumbnailsController,
    RedditlikeOwnerAttachmentsGenerate_thumbnailsController,
    RedditlikeGuestAttachmentsAccessController,
    RedditlikeMemberAttachmentsAccessController,
    RedditlikeModeratorAttachmentsAccessController,
    RedditlikeOwnerAttachmentsAccessController,
    RedditlikeOwnerAttachmentsBatch_cleanupController,
    RedditlikeMemberSubscribed_communitiesController,
    RedditlikeMemberCommunitiesSubscriptionController,
    RedditlikeMemberFeedsHomeController,
    RedditlikeGuestFeedsPopularController,
    RedditlikeMemberFeedsPopularController,
    RedditlikeGuestPostsCommentsController,
    RedditlikeOwnerPostsCommentsController,
    RedditlikeGuestPostsCommentsSortedController,
    RedditlikeMemberPostsCommentsSortedController,
    RedditlikeModeratorPostsCommentsSortedController,
    RedditlikeOwnerPostsCommentsSortedController,
    RedditlikeModeratorCommunitiesReportsPendingController,
    RedditlikeOwnerCommunitiesReportsPendingController,
    RedditlikeOwnerReportsController,
  ],
})
export class MyModule {}
