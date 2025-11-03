import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityBbsAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsAuditLog";
import type { ICommunityBbsComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsComment";
import type { ICommunityBbsCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsCommunity";
import type { ICommunityBbsCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsCommunityMember";
import type { ICommunityBbsCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsCommunityModerator";
import type { ICommunityBbsCommunitySettings } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsCommunitySettings";
import type { ICommunityBbsModerationAction } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsModerationAction";
import type { ICommunityBbsPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsPost";
import type { ICommunityBbsPostMedia } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsPostMedia";
import type { ICommunityBbsReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsReport";
import type { ICommunityBbsSystemAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsSystemAdmin";

export async function test_api_audit_log_retrieval_by_system_admin(
  connection: api.IConnection,
) {
  // 1) Prepare isolated connections for admin and member actors
  const adminConn: api.IConnection = { ...connection, headers: {} };
  const memberConn: api.IConnection = { ...connection, headers: {} };

  // 2) Create system admin and assert
  const adminBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "Passw0rd1",
    display_name: RandomGenerator.name(2),
  } satisfies ICommunityBbsSystemAdmin.ICreate;

  const admin: ICommunityBbsSystemAdmin.IAuthorized =
    await api.functional.auth.systemAdmin.join(adminConn, { body: adminBody });
  typia.assert(admin);

  // 3) Create a community member and assert
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberUsername = RandomGenerator.alphaNumeric(8);
  const memberBody = {
    email: memberEmail,
    username: memberUsername,
    password: "Passw0rd1",
    session_context: {
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  } satisfies ICommunityBbsCommunityMember.ICreate;

  const member: ICommunityBbsCommunityMember.IAuthorized =
    await api.functional.auth.communityMember.join(memberConn, {
      body: memberBody,
    });
  typia.assert(member);

  // 4) Create a community as the community member
  const uniqueSlug = `test-community-${Date.now()}-${RandomGenerator.alphaNumeric(4)}`;
  const communityCreateBody = {
    name: RandomGenerator.name(2),
    slug: uniqueSlug,
    description: RandomGenerator.paragraph({ sentences: 6 }),
    visibility: "public",
    post_approval_required: false,
  } satisfies ICommunityBbsCommunity.ICreate;

  const community: ICommunityBbsCommunity =
    await api.functional.communityBbs.communityMember.communities.create(
      memberConn,
      {
        body: communityCreateBody,
      },
    );
  typia.assert(community);
  TestValidator.equals(
    "created community slug matches request",
    community.slug,
    uniqueSlug,
  );

  // 5) Create a post in that community as the community member
  const postCreateBody = {
    title: RandomGenerator.paragraph({ sentences: 3, wordMin: 3, wordMax: 10 }),
    body: RandomGenerator.content({ paragraphs: 2 }),
    post_type: "text",
  } satisfies ICommunityBbsPost.ICreate;

  const post: ICommunityBbsPost =
    await api.functional.communityBbs.communityMember.communities.posts.create(
      memberConn,
      {
        communitySlug: community.slug,
        body: postCreateBody,
      },
    );
  typia.assert(post);
  TestValidator.equals(
    "created post community id matches",
    post.community.id,
    community.id,
  );

  // 6) As system admin, record a moderation action against the post.
  // Use adminConn so moderator_id may be null (admin attribution).
  const moderationBody = {
    moderator_id: null,
    target_post_id: post.id,
    action_type: "remove",
    reason_code: "test.moderation",
    note: "Automated test: remove for audit log generation",
  } satisfies ICommunityBbsModerationAction.ICreate;

  const moderationAction: ICommunityBbsModerationAction =
    await api.functional.communityBbs.communityMember.moderation.posts.actions.takeAction(
      adminConn,
      {
        postId: post.id,
        body: moderationBody,
      },
    );
  typia.assert(moderationAction);
  TestValidator.equals(
    "moderation action recorded: target id matches",
    moderationAction.target?.target_id,
    post.id,
  );
  TestValidator.equals(
    "moderation action type recorded",
    moderationAction.action_type,
    moderationBody.action_type,
  );

  // 7) Attempt to retrieve the corresponding audit log as system admin.
  // Use moderationAction.id as the auditLogId (pragmatic mapping). If the
  // system uses a different mapping, this call may 404 which will be covered
  // by the negative case below.
  const auditLogId = moderationAction.id as string & tags.Format<"uuid">;

  const auditLog: ICommunityBbsAuditLog =
    await api.functional.communityBbs.systemAdmin.audit.logs.at(adminConn, {
      auditLogId,
    });
  typia.assert(auditLog);

  // Business validations
  TestValidator.equals("audit log entity is post", auditLog.entity, "post");
  TestValidator.equals(
    "audit log action matches moderation action",
    auditLog.action,
    moderationAction.action_type,
  );
  TestValidator.predicate(
    "audit log has payload_summary",
    auditLog.payload_summary !== null && auditLog.payload_summary !== undefined,
  );

  // Ensure sanitized: payload_summary should not contain obvious sensitive tokens or raw emails
  TestValidator.predicate(
    "payload_summary appears sanitized (does not include 'token'/'password'/'@')",
    typeof auditLog.payload_summary === "string" &&
      !auditLog.payload_summary.includes("token") &&
      !auditLog.payload_summary.includes("password") &&
      !auditLog.payload_summary.includes("@"),
  );

  // 8) Negative case: non-admin (community member) tries to retrieve -> expect error
  await TestValidator.error("non-admin cannot retrieve audit log", async () => {
    await api.functional.communityBbs.systemAdmin.audit.logs.at(memberConn, {
      auditLogId: auditLogId,
    });
  });

  // 9) Negative case: non-existent auditLogId (valid UUID but unlikely to exist) -> expect 404
  const randomAuditId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error(
    "non-existent audit log returns error",
    async () => {
      await api.functional.communityBbs.systemAdmin.audit.logs.at(adminConn, {
        auditLogId: randomAuditId,
      });
    },
  );
}
