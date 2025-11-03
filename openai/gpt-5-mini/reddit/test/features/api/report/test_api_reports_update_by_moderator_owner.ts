import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityBbsComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsComment";
import type { ICommunityBbsCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsCommunity";
import type { ICommunityBbsCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsCommunityMember";
import type { ICommunityBbsCommunitySettings } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsCommunitySettings";
import type { ICommunityBbsPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsPost";
import type { ICommunityBbsPostMedia } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsPostMedia";
import type { ICommunityBbsReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsReport";
import type { ICommunityBbsSystemAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsSystemAdmin";

export async function test_api_reports_update_by_moderator_owner(
  connection: api.IConnection,
) {
  // 1) Prepare isolated connections for two actors: moderator (owner) and reporter
  const modConn: api.IConnection = { ...connection, headers: {} };
  const reporterConn: api.IConnection = { ...connection, headers: {} };

  // 2) Create moderator (community member) account
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderatorUsername = RandomGenerator.alphaNumeric(8);
  const moderatorAuth: ICommunityBbsCommunityMember.IAuthorized =
    await api.functional.auth.communityMember.join(modConn, {
      body: {
        email: moderatorEmail,
        username: moderatorUsername,
        password: "Passw0rd!",
        session_context: {
          href: "https://example.com/signup",
          referrer: "https://example.com",
        },
      } satisfies ICommunityBbsCommunityMember.ICreate,
    });
  typia.assert(moderatorAuth);

  // 3) Create reporter account
  const reporterEmail = typia.random<string & tags.Format<"email">>();
  const reporterUsername = RandomGenerator.alphaNumeric(8);
  const reporterAuth: ICommunityBbsCommunityMember.IAuthorized =
    await api.functional.auth.communityMember.join(reporterConn, {
      body: {
        email: reporterEmail,
        username: reporterUsername,
        password: "Passw0rd!",
        session_context: {
          href: "https://example.com/signup",
          referrer: "https://example.com",
        },
      } satisfies ICommunityBbsCommunityMember.ICreate,
    });
  typia.assert(reporterAuth);

  // 4) As moderator: create a community with a unique slug
  const communitySlug = `test-community-${Date.now()}`;
  const community: ICommunityBbsCommunity =
    await api.functional.communityBbs.communityMember.communities.create(
      modConn,
      {
        body: {
          name: `Test Community ${Date.now()}`,
          slug: communitySlug,
          description: RandomGenerator.paragraph({ sentences: 6 }),
          visibility: "public",
        } satisfies ICommunityBbsCommunity.ICreate,
      },
    );
  typia.assert(community);
  TestValidator.equals(
    "created community slug matches",
    community.slug,
    communitySlug,
  );

  // 5) As moderator: create a post in the community
  const createdPost: ICommunityBbsPost =
    await api.functional.communityBbs.communityMember.communities.posts.create(
      modConn,
      {
        communitySlug: community.slug,
        body: {
          title: RandomGenerator.paragraph({ sentences: 3 }),
          body: RandomGenerator.content({ paragraphs: 2 }),
          post_type: "text",
        } satisfies ICommunityBbsPost.ICreate,
      },
    );
  typia.assert(createdPost);

  // 6) As reporter: file a report against the created post
  const createdReport: ICommunityBbsReport =
    await api.functional.communityBbs.reports.create(reporterConn, {
      body: {
        target_type: "post",
        target_id: createdPost.id,
        reason_code: "spam",
        explanation: "Automated test report: spam content",
      } satisfies ICommunityBbsReport.ICreate,
    });
  typia.assert(createdReport);
  TestValidator.predicate(
    "report has id",
    typeof createdReport.id === "string",
  );

  // 7) As moderator: update lifecycle fields on the report
  const updatePayload: ICommunityBbsReport.IUpdate = {
    status: "resolved",
    priority: "high",
    handled_by_actor_type: "community_moderator",
    handled_by_actor_id: moderatorAuth.member.id,
    resolved_at: new Date().toISOString(),
    updated_at: createdReport.updated_at ?? new Date().toISOString(),
  };

  const updatedReport: ICommunityBbsReport =
    await api.functional.communityBbs.communityMember.reports.update(modConn, {
      reportId: createdReport.id,
      body: updatePayload,
    });
  typia.assert(updatedReport);

  // Validate lifecycle fields reflect the update
  TestValidator.equals(
    "report status updated",
    updatedReport.status,
    "resolved",
  );
  TestValidator.equals(
    "report priority updated",
    updatedReport.priority,
    "high",
  );
  TestValidator.equals(
    "handled_by_actor_type set",
    updatedReport.handled_by_actor_type,
    "community_moderator",
  );
  TestValidator.equals(
    "handled_by_actor_id set",
    updatedReport.handled_by_actor_id,
    moderatorAuth.member.id,
  );
  TestValidator.predicate(
    "resolved_at is set",
    updatedReport.resolved_at !== null &&
      updatedReport.resolved_at !== undefined,
  );

  // 8) Negative: attempt the same update as a non-moderator (reporter) -> must error
  await TestValidator.error(
    "non-moderator cannot update report lifecycle",
    async () => {
      await api.functional.communityBbs.communityMember.reports.update(
        reporterConn,
        {
          reportId: createdReport.id,
          body: { status: "in_review" } satisfies ICommunityBbsReport.IUpdate,
        },
      );
    },
  );

  // 9) Negative: simulate concurrent modification with stale updated_at -> must error
  const staleUpdatedAt = new Date(
    Date.parse(updatedReport.updated_at ?? new Date().toISOString()) - 10000,
  ).toISOString();
  await TestValidator.error(
    "stale updated_at causes optimistic concurrency failure",
    async () => {
      await api.functional.communityBbs.communityMember.reports.update(
        modConn,
        {
          reportId: createdReport.id,
          body: {
            status: "dismissed",
            updated_at: staleUpdatedAt,
          } satisfies ICommunityBbsReport.IUpdate,
        },
      );
    },
  );
}
