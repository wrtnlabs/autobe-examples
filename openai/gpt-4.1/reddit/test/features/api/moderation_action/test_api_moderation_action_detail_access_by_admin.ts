import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformModerationAction } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerationAction";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReport";
import type { ICommunityPlatformReportCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReportCategory";

/**
 * Validates access to detailed moderation action info as an admin, including
 * all business logic and negative access.
 *
 * Steps:
 *
 * 1. Register admin and member.
 * 2. Member creates a community and post.
 * 3. Admin creates report category.
 * 4. Member files a report for the post.
 * 5. Admin creates moderation action linked to the report and post.
 * 6. Admin requests moderation action detail; verifies all fields (actor_id,
 *    targets, report_id, action_type, description, timestamps).
 * 7. Negative test: request with random (nonexistent) moderationActionId as admin,
 *    assert error.
 * 8. Negative test: request as member (not admin), assert denial.
 */
export async function test_api_moderation_action_detail_access_by_admin(
  connection: api.IConnection,
) {
  // 1. Register admin
  const adminJoin = await api.functional.auth.admin.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(12),
    } satisfies ICommunityPlatformAdmin.ICreate,
  });
  typia.assert(adminJoin);
  // Store admin info and token for later use
  const adminId = adminJoin.id;
  const adminToken = adminJoin.token.access;

  // 2. Register member (to create community and post)
  await api.functional.auth.member.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(10),
    } satisfies ICommunityPlatformMember.ICreate,
  });
  // member authentication token now in connection.headers.

  // 3. Member creates a community
  const comm = await api.functional.communityPlatform.member.communities.create(
    connection,
    {
      body: {
        name: RandomGenerator.alphaNumeric(8),
        title: RandomGenerator.paragraph({ sentences: 3 }),
        description: RandomGenerator.content({ paragraphs: 2 }),
        slug: RandomGenerator.alphaNumeric(10).toLowerCase(),
      } satisfies ICommunityPlatformCommunity.ICreate,
    },
  );
  typia.assert(comm);
  const communityId = comm.id;

  // 4. Member creates a post in the community
  const post = await api.functional.communityPlatform.member.posts.create(
    connection,
    {
      body: {
        community_platform_community_id: communityId,
        title: RandomGenerator.paragraph({ sentences: 6 }),
        content_body: RandomGenerator.content({ paragraphs: 1 }),
        content_type: "text",
      } satisfies ICommunityPlatformPost.ICreate,
    },
  );
  typia.assert(post);

  // 5. Admin creates a report category
  // Switch to admin by restoring admin token
  const adminConn: api.IConnection = {
    ...connection,
    headers: { ...(connection.headers || {}), Authorization: adminToken },
  };
  const category =
    await api.functional.communityPlatform.admin.reportCategories.create(
      adminConn,
      {
        body: {
          name: RandomGenerator.alphabets(10),
          allow_free_text: true,
        } satisfies ICommunityPlatformReportCategory.ICreate,
      },
    );
  typia.assert(category);

  // 6. Switch back to member; file a report against the post
  // member token is still valid in connection
  const report = await api.functional.communityPlatform.member.reports.create(
    connection,
    {
      body: {
        post_id: post.id,
        report_category_id: category.id,
        reason_text: RandomGenerator.paragraph({ sentences: 2 }),
      } satisfies ICommunityPlatformReport.ICreate,
    },
  );
  typia.assert(report);

  // 7. Switch to admin conn again, create a moderation action referencing the above
  const action =
    await api.functional.communityPlatform.admin.moderationActions.create(
      adminConn,
      {
        body: {
          actor_id: adminId,
          target_post_id: post.id,
          report_id: report.id,
          action_type: "remove_post",
          description: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies ICommunityPlatformModerationAction.ICreate,
      },
    );
  typia.assert(action);

  // 8. As admin, retrieve moderation action detail by id and validate all attributes
  const detail =
    await api.functional.communityPlatform.admin.moderationActions.at(
      adminConn,
      {
        moderationActionId: action.id,
      },
    );
  typia.assert(detail);
  TestValidator.equals("moderation actor is admin", detail.actor_id, adminId);
  TestValidator.equals("targeted post matches", detail.target_post_id, post.id);
  TestValidator.equals("referenced report", detail.report_id, report.id);
  TestValidator.equals(
    "action type should be remove_post",
    detail.action_type,
    "remove_post",
  );
  TestValidator.predicate("created_at is present", !!detail.created_at);
  TestValidator.predicate(
    "no redaction for admin",
    detail.description !== undefined,
  );

  // 9. Negative: query with non-existent moderationActionId as admin → should error
  await TestValidator.error(
    "non-existent moderationActionId as admin errors",
    async () => {
      await api.functional.communityPlatform.admin.moderationActions.at(
        adminConn,
        {
          moderationActionId: typia.random<string & tags.Format<"uuid">>(),
        },
      );
    },
  );

  // 10. Negative: as member (not admin), try to access admin moderation action detail; must deny
  await TestValidator.error(
    "member access to admin moderation action detail denied",
    async () => {
      await api.functional.communityPlatform.admin.moderationActions.at(
        connection,
        {
          moderationActionId: action.id,
        },
      );
    },
  );
}
