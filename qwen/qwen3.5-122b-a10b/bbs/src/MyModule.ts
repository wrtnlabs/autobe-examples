import { Module } from "@nestjs/common";

import { DiscussionboardAdminAdmin_requestsController } from "./controllers/discussionBoard/admin/admin-requests/DiscussionboardAdminAdmin_requestsController";
import { DiscussionboardAdminAdmin_requestsPendingController } from "./controllers/discussionBoard/admin/admin-requests/pending/DiscussionboardAdminAdmin_requestsPendingController";
import { DiscussionboardAdminAdminBansController } from "./controllers/discussionBoard/admin/admin/bans/DiscussionboardAdminAdminBansController";
import { DiscussionboardAdminAdminRequestsController } from "./controllers/discussionBoard/admin/admin/requests/DiscussionboardAdminAdminRequestsController";
import { DiscussionboardAdminAdminsController } from "./controllers/discussionBoard/admin/admins/DiscussionboardAdminAdminsController";
import { DiscussionboardAdminArticlesController } from "./controllers/discussionBoard/admin/articles/DiscussionboardAdminArticlesController";
import { DiscussionboardAdminArticlesCommentsController } from "./controllers/discussionBoard/admin/articles/comments/DiscussionboardAdminArticlesCommentsController";
import { DiscussionboardAdminArticlesCommentsSnapshotsController } from "./controllers/discussionBoard/admin/articles/comments/snapshots/DiscussionboardAdminArticlesCommentsSnapshotsController";
import { DiscussionboardAdminArticlesSnapshotsController } from "./controllers/discussionBoard/admin/articles/snapshots/DiscussionboardAdminArticlesSnapshotsController";
import { DiscussionboardAdminAudit_logsController } from "./controllers/discussionBoard/admin/audit-logs/DiscussionboardAdminAudit_logsController";
import { DiscussionboardAdminAudit_logsAnalyticsController } from "./controllers/discussionBoard/admin/audit-logs/analytics/DiscussionboardAdminAudit_logsAnalyticsController";
import { DiscussionboardAdminBan_recordsController } from "./controllers/discussionBoard/admin/ban-records/DiscussionboardAdminBan_recordsController";
import { DiscussionboardAdminDashboardSystemController } from "./controllers/discussionBoard/admin/dashboard/system/DiscussionboardAdminDashboardSystemController";
import { DiscussionboardAdminGuestsController } from "./controllers/discussionBoard/admin/guests/DiscussionboardAdminGuestsController";
import { DiscussionboardAdminMonitoringController } from "./controllers/discussionBoard/admin/monitoring/metrics/DiscussionboardAdminMonitoringController";
import { DiscussionboardAdminMonitoringSecurityController } from "./controllers/discussionBoard/admin/monitoring/security/DiscussionboardAdminMonitoringSecurityController";
import { DiscussionboardAdminReportsActivityController } from "./controllers/discussionBoard/admin/reports/activity/DiscussionboardAdminReportsActivityController";
import { DiscussionboardAdminReportsContentController } from "./controllers/discussionBoard/admin/reports/content/DiscussionboardAdminReportsContentController";
import { DiscussionboardAdminSectionsController } from "./controllers/discussionBoard/admin/sections/DiscussionboardAdminSectionsController";
import { DiscussionboardAdminSystemAudit_logsController } from "./controllers/discussionBoard/admin/system/audit-logs/DiscussionboardAdminSystemAudit_logsController";
import { DiscussionboardAdminSystemSettingsController } from "./controllers/discussionBoard/admin/system/settings/DiscussionboardAdminSystemSettingsController";
import { DiscussionboardAdminTagsController } from "./controllers/discussionBoard/admin/tags/DiscussionboardAdminTagsController";
import { DiscussionboardArticlesController } from "./controllers/discussionBoard/articles/DiscussionboardArticlesController";
import { DiscussionboardArticlesCommentsController } from "./controllers/discussionBoard/articles/comments/DiscussionboardArticlesCommentsController";
import { DiscussionboardAuthAdminController } from "./controllers/discussionBoard/auth/admin/DiscussionboardAuthAdminController";
import { DiscussionboardAuthGuestController } from "./controllers/discussionBoard/auth/guest/DiscussionboardAuthGuestController";
import { DiscussionboardAuthMemberController } from "./controllers/discussionBoard/auth/member/DiscussionboardAuthMemberController";
import { DiscussionboardGuestArticlesController } from "./controllers/discussionBoard/guest/articles/search/DiscussionboardGuestArticlesController";
import { DiscussionboardMemberAdmin_requestsController } from "./controllers/discussionBoard/member/admin-requests/DiscussionboardMemberAdmin_requestsController";
import { DiscussionboardMemberArticlesController } from "./controllers/discussionBoard/member/articles/DiscussionboardMemberArticlesController";
import { DiscussionboardMemberArticlesCommentsController } from "./controllers/discussionBoard/member/articles/comments/DiscussionboardMemberArticlesCommentsController";
import { DiscussionboardMemberProfileController } from "./controllers/discussionBoard/member/profile/DiscussionboardMemberProfileController";
import { DiscussionboardMemberSessionsController } from "./controllers/discussionBoard/member/sessions/DiscussionboardMemberSessionsController";
import { DiscussionboardMembersController } from "./controllers/discussionBoard/members/DiscussionboardMembersController";
import { DiscussionboardSectionsController } from "./controllers/discussionBoard/sections/DiscussionboardSectionsController";
import { DiscussionboardTagsController } from "./controllers/discussionBoard/tags/DiscussionboardTagsController";

@Module({
  controllers: [
    DiscussionboardAuthGuestController,
    DiscussionboardAuthMemberController,
    DiscussionboardAuthAdminController,
    DiscussionboardMembersController,
    DiscussionboardMemberProfileController,
    DiscussionboardAdminGuestsController,
    DiscussionboardAdminAdminsController,
    DiscussionboardMemberSessionsController,
    DiscussionboardAdminAudit_logsController,
    DiscussionboardSectionsController,
    DiscussionboardAdminSectionsController,
    DiscussionboardArticlesController,
    DiscussionboardMemberArticlesController,
    DiscussionboardAdminArticlesController,
    DiscussionboardTagsController,
    DiscussionboardAdminTagsController,
    DiscussionboardAdminArticlesSnapshotsController,
    DiscussionboardArticlesCommentsController,
    DiscussionboardMemberArticlesCommentsController,
    DiscussionboardAdminArticlesCommentsController,
    DiscussionboardAdminArticlesCommentsSnapshotsController,
    DiscussionboardMemberAdmin_requestsController,
    DiscussionboardAdminAdminRequestsController,
    DiscussionboardAdminAdmin_requestsController,
    DiscussionboardAdminAdminBansController,
    DiscussionboardAdminBan_recordsController,
    DiscussionboardAdminSystemSettingsController,
    DiscussionboardAdminSystemAudit_logsController,
    DiscussionboardGuestArticlesController,
    DiscussionboardAdminAdmin_requestsPendingController,
    DiscussionboardAdminAudit_logsAnalyticsController,
    DiscussionboardAdminDashboardSystemController,
    DiscussionboardAdminReportsActivityController,
    DiscussionboardAdminReportsContentController,
    DiscussionboardAdminMonitoringController,
    DiscussionboardAdminMonitoringSecurityController,
  ],
})
export class MyModule {}
