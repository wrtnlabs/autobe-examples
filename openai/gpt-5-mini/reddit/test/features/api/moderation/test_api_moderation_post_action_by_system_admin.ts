import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
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

/**
 * Validate that a system administrator can record a moderation action against a
 * post and that the action is persisted and references the moderated target.
 * Also verify RBAC: non-admins cannot invoke the admin moderation endpoint, and
 * invalid inputs (non-existent origin_report_id, expires_at in past) are
 * rejected.
 *
 * Steps:
 *
 * 1. Create a communityMember (author) via /auth/communityMember/join
 * 2. Create a community as the author
 * 3. (Optional) Upload media as the author and attach to post
 * 4. Create a post in the community as the author
 * 5. Create a systemAdmin via /auth/systemAdmin/join
 * 6. As admin, call POST
 *    /communityBbs/systemAdmin/moderation/posts/{postId}/actions to remove the
 *    post and assert moderation action result
 * 7. Assert non-admin (author) calling same endpoint fails (await
 *    TestValidator.error)
 * 8. Assert invalid origin_report_id and past expires_at are rejected (await
 *    TestValidator.error)
 */
export async function test_api_moderation_post_action_by_system_admin(
  connection: api.IConnection,
) {
  // 0. Prepare unique suffix for resources
  const unique = `${Date.now()}-${RandomGenerator.alphaNumeric(4)}`;

  // 1. Create communityMember (author)
  const authorConn: api.IConnection = { ...connection, headers: {} };
  const authorBody = {
    email: `author.${unique}@example.test`,
    username: `author_${unique}`,
    password: "Passw0rd!",
    session_context: {
      href: "https://example.test/",
      referrer: "https://example.ref/",
      ip: null,
      session_ttl_seconds: null,
    },
  } satisfies ICommunityBbsCommunityMember.ICreate;

  const author: ICommunityBbsCommunityMember.IAuthorized =
    await api.functional.auth.communityMember.join(authorConn, {
      body: authorBody,
    });
  typia.assert(author);

  // 2. Create community as the author
  const communitySlug = `test-community-${unique}`;
  const communityBody = {
    name: `Test Community ${unique}`,
    slug: communitySlug,
    description: `E2E test community ${unique}`,
    visibility: "public",
    post_approval_required: false,
  } satisfies ICommunityBbsCommunity.ICreate;

  const community: ICommunityBbsCommunity =
    await api.functional.communityBbs.communityMember.communities.create(
      authorConn,
      {
        body: communityBody,
      },
    );
  typia.assert(community);
  TestValidator.equals(
    "created community slug matches request",
    community.slug,
    communitySlug,
  );

  // 3. Optional: Upload media as author (try and fallback to no media)
  let uploadedMedia: ICommunityBbsPostMedia | null = null;
  try {
    const uploadBody = {
      upload_mode: "url",
      url: typia.random<string & tags.Format<"uri">>(),
      media_type: "image/png",
      size_bytes: typia.random<number & tags.Type<"int32"> & tags.Minimum<0>>(),
      ordering: 0,
      community_bbs_post_id: null,
    } satisfies ICommunityBbsPostMedia.ICreate;

    uploadedMedia =
      await api.functional.communityBbs.communityMember.uploads.create(
        authorConn,
        {
          body: uploadBody,
        },
      );
    typia.assert(uploadedMedia);
    TestValidator.predicate(
      "upload returned a url",
      typeof uploadedMedia.url === "string" && uploadedMedia.url.length > 0,
    );
  } catch {
    // If upload not permitted by environment, continue without media
    uploadedMedia = null;
  }

  // 4. Create a post in the community as author
  const postBody = uploadedMedia
    ? ({
        title: `E2E Test Post ${unique}`,
        body: "This is a test post with media",
        post_type: "image",
        media_ids: [uploadedMedia.id],
      } satisfies ICommunityBbsPost.ICreate)
    : ({
        title: `E2E Test Post ${unique}`,
        body: "This is a test post without media",
        post_type: "text",
      } satisfies ICommunityBbsPost.ICreate);

  const post: ICommunityBbsPost =
    await api.functional.communityBbs.communityMember.communities.posts.create(
      authorConn,
      {
        communitySlug: community.slug,
        body: postBody,
      },
    );
  typia.assert(post);
  TestValidator.equals(
    "post community matches",
    post.community.slug,
    community.slug,
  );
  TestValidator.equals("post author matches", post.author.id, author.member.id);

  // 5. Create systemAdmin
  const adminConn: api.IConnection = { ...connection, headers: {} };
  const adminBody = {
    email: `admin.${unique}@example.test`,
    password: "Passw0rd!",
    display_name: `sysadmin-${unique}`,
  } satisfies ICommunityBbsSystemAdmin.ICreate;

  const admin: ICommunityBbsSystemAdmin.IAuthorized =
    await api.functional.auth.systemAdmin.join(adminConn, {
      body: adminBody,
    });
  typia.assert(admin);

  // 6. As admin, take moderation action: remove post
  const actionBody = {
    moderator_id: null,
    target_post_id: post.id,
    target_comment_id: null,
    target_community_id: null,
    origin_report_id: null,
    action_type: "remove",
    reason_code: "policy_violation",
    note: "Automated E2E test removal",
    expires_at: null,
  } satisfies ICommunityBbsModerationAction.ICreate;

  const moderationAction: ICommunityBbsModerationAction =
    await api.functional.communityBbs.systemAdmin.moderation.posts.actions.takeAction(
      adminConn,
      {
        postId: post.id,
        body: actionBody,
      },
    );
  typia.assert(moderationAction);

  TestValidator.equals(
    "moderation action recorded type",
    moderationAction.action_type,
    "remove",
  );

  TestValidator.predicate(
    "moderation action references the post",
    moderationAction.target !== null &&
      moderationAction.target !== undefined &&
      moderationAction.target.target_type === "post" &&
      moderationAction.target.target_id === post.id,
  );

  // 7. RBAC: non-admin (author) calling same endpoint should fail
  await TestValidator.error(
    "non-admin cannot perform system admin moderation",
    async () => {
      await api.functional.communityBbs.systemAdmin.moderation.posts.actions.takeAction(
        authorConn,
        {
          postId: post.id,
          body: {
            action_type: "remove",
            moderator_id: null,
            target_post_id: post.id,
          } satisfies ICommunityBbsModerationAction.ICreate,
        },
      );
    },
  );

  // 8. Invalid origin_report_id (syntactically valid but non-existent) -> expect error
  await TestValidator.error(
    "invalid origin_report_id should be rejected",
    async () => {
      await api.functional.communityBbs.systemAdmin.moderation.posts.actions.takeAction(
        adminConn,
        {
          postId: post.id,
          body: {
            action_type: "remove",
            origin_report_id: "00000000-0000-0000-0000-000000000000",
            moderator_id: null,
            target_post_id: post.id,
          } satisfies ICommunityBbsModerationAction.ICreate,
        },
      );
    },
  );

  // 9. Invalid expires_at (past timestamp) -> expect error
  await TestValidator.error(
    "expires_at in the past should be rejected",
    async () => {
      await api.functional.communityBbs.systemAdmin.moderation.posts.actions.takeAction(
        adminConn,
        {
          postId: post.id,
          body: {
            action_type: "remove",
            expires_at: new Date(Date.now() - 60_000).toISOString(), // 1 minute in the past
            moderator_id: null,
            target_post_id: post.id,
          } satisfies ICommunityBbsModerationAction.ICreate,
        },
      );
    },
  );

  // Final business sanity checks
  TestValidator.predicate(
    "moderation action created has created_at",
    typeof moderationAction.created_at === "string",
  );
}
