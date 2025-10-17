import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPortalAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPortalAdmin";
import type { ICommunityPortalCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPortalCommunity";
import type { ICommunityPortalMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPortalMember";
import type { ICommunityPortalPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPortalPost";
import type { ICommunityPortalReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPortalReport";
import type { ICommunityPortalUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPortalUser";

export async function test_api_report_hard_delete_by_admin(
  connection: api.IConnection,
) {
  // 1. Prepare isolated connections for each role so the SDK sets tokens on them
  const memberConn: api.IConnection = { ...connection, headers: {} };
  const adminConn: api.IConnection = { ...connection, headers: {} };
  const unauthConn: api.IConnection = { ...connection, headers: {} };

  // 2. Member registration (reporter)
  const memberAuth: ICommunityPortalMember.IAuthorized =
    await api.functional.auth.member.join(memberConn, {
      body: {
        username: RandomGenerator.name(1).replace(/\s+/g, "_").toLowerCase(),
        email: typia.random<string & tags.Format<"email">>(),
        password: "P@ssw0rd!",
        display_name: RandomGenerator.name(),
      } satisfies ICommunityPortalMember.ICreate,
    });
  typia.assert(memberAuth);

  // 3. Create a community as the member
  const community: ICommunityPortalCommunity =
    await api.functional.communityPortal.member.communities.create(memberConn, {
      body: {
        name: RandomGenerator.paragraph({ sentences: 3 }),
        slug: undefined,
        description: RandomGenerator.paragraph({ sentences: 5 }),
        is_private: false,
        visibility: "public",
      } satisfies ICommunityPortalCommunity.ICreate,
    });
  typia.assert(community);

  // 4. Create a text post in the community as the member
  const post: ICommunityPortalPost =
    await api.functional.communityPortal.member.posts.create(memberConn, {
      body: {
        community_id: community.id,
        post_type: "text",
        title: RandomGenerator.paragraph({ sentences: 3 }),
        body: RandomGenerator.content({ paragraphs: 2 }),
      } satisfies ICommunityPortalPost.ICreate,
    });
  typia.assert(post);

  // 5. File a moderation report against the post as the member
  const report: ICommunityPortalReport =
    await api.functional.communityPortal.member.reports.create(memberConn, {
      body: {
        postId: post.id,
        reasonCode: "spam",
        reasonText: "Inappropriate promotional content",
        isUrgent: false,
      } satisfies ICommunityPortalReport.ICreate,
    });
  typia.assert(report);

  // 6. Create an admin account on a separate connection
  const adminAuth: ICommunityPortalAdmin.IAuthorized =
    await api.functional.auth.admin.join(adminConn, {
      body: {
        username: `admin_${RandomGenerator.alphaNumeric(6)}`,
        email: typia.random<string & tags.Format<"email">>(),
        password: "AdminP@ssw0rd!",
        displayName: RandomGenerator.name(),
        isActive: true,
      } satisfies ICommunityPortalAdmin.ICreate,
    });
  typia.assert(adminAuth);

  // 7. As admin, hard-delete (erase) the report
  await api.functional.communityPortal.admin.reports.erase(adminConn, {
    reportId: report.id,
  });

  // 8. Confirm hard-delete by attempting to delete the same report again as admin
  await TestValidator.error(
    "hard-deleted report cannot be deleted again",
    async () => {
      await api.functional.communityPortal.admin.reports.erase(adminConn, {
        reportId: report.id,
      });
    },
  );

  // 9. Authorization checks:
  // 9a. Non-admin (member) attempt to hard-delete should fail
  await TestValidator.error("non-admin cannot hard-delete report", async () => {
    await api.functional.communityPortal.admin.reports.erase(memberConn, {
      reportId: report.id,
    });
  });

  // 9b. Unauthenticated attempt should fail
  await TestValidator.error(
    "unauthenticated cannot hard-delete report",
    async () => {
      await api.functional.communityPortal.admin.reports.erase(unauthConn, {
        reportId: report.id,
      });
    },
  );
}
