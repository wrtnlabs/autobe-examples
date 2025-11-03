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

export async function test_api_moderation_comment_action_by_moderator(
  connection: api.IConnection,
) {
  // 1) Create author/moderator account (creator of community)
  const authorConn: api.IConnection = { ...connection, headers: {} };
  const authorPayload = {
    email: `author.${Date.now()}@example.test`,
    username: `author_${RandomGenerator.alphaNumeric(6)}`,
    password: "Passw0rd!",
    session_context: {
      href: "https://example.test/signup",
      referrer: "https://example.test/",
    },
  } satisfies ICommunityBbsCommunityMember.ICreate;

  const authorAuth: ICommunityBbsCommunityMember.IAuthorized =
    await api.functional.auth.communityMember.join(authorConn, {
      body: authorPayload,
    });
  typia.assert(authorAuth);

  // 2) Create a separate non-moderator account
  const nonModConn: api.IConnection = { ...connection, headers: {} };
  const nonModPayload = {
    email: `nonmod.${Date.now()}@example.test`,
    username: `nonmod_${RandomGenerator.alphaNumeric(6)}`,
    password: "Passw0rd!",
    session_context: {
      href: "https://example.test/signup",
      referrer: "https://example.test/",
    },
  } satisfies ICommunityBbsCommunityMember.ICreate;

  const nonModAuth: ICommunityBbsCommunityMember.IAuthorized =
    await api.functional.auth.communityMember.join(nonModConn, {
      body: nonModPayload,
    });
  typia.assert(nonModAuth);

  // 3) Create community as author (creator will be used as moderator)
  const slug = `test-community-${Date.now()}`;
  const communityCreate = {
    name: RandomGenerator.name(2),
    slug,
    description: RandomGenerator.paragraph({ sentences: 6 }),
    visibility: "public",
  } satisfies ICommunityBbsCommunity.ICreate;

  const community: ICommunityBbsCommunity =
    await api.functional.communityBbs.communityMember.communities.create(
      authorConn,
      { body: communityCreate },
    );
  typia.assert(community);
  TestValidator.equals("community slug matches", community.slug, slug);

  // 4) Create a post in the community as author
  const postCreate = {
    title: RandomGenerator.paragraph({ sentences: 3 }),
    body: RandomGenerator.content({ paragraphs: 2 }),
    post_type: "text",
  } satisfies ICommunityBbsPost.ICreate;

  const post: ICommunityBbsPost =
    await api.functional.communityBbs.communityMember.communities.posts.create(
      authorConn,
      {
        communitySlug: community.slug,
        body: postCreate,
      },
    );
  typia.assert(post);
  TestValidator.equals(
    "post community id matches",
    post.community_bbs_community_id,
    community.id,
  );

  // 5) Create a comment on the post as author
  const commentCreate = {
    body: RandomGenerator.paragraph({ sentences: 8 }),
  } satisfies ICommunityBbsComment.ICreate;

  const comment: ICommunityBbsComment =
    await api.functional.communityBbs.communityMember.posts.comments.create(
      authorConn,
      {
        postId: post.id,
        body: commentCreate,
      },
    );
  typia.assert(comment);
  TestValidator.equals(
    "comment post id matches",
    comment.community_bbs_post_id,
    post.id,
  );

  // 6) As moderator (author), record a moderation action to remove the comment
  const removeBody = {
    // moderator_id omitted (null) because this test uses the creator-as-moderator flow
    moderator_id: null,
    target_comment_id: comment.id,
    action_type: "remove",
    reason_code: "test_remove",
    note: "Removing comment in e2e test",
    expires_at: null,
  } satisfies ICommunityBbsModerationAction.ICreate;

  const action: ICommunityBbsModerationAction =
    await api.functional.communityBbs.communityMember.moderation.comments.actions.takeAction(
      authorConn,
      {
        commentId: comment.id,
        body: removeBody,
      },
    );
  typia.assert(action);

  TestValidator.equals(
    "moderation action type is remove",
    action.action_type,
    "remove",
  );
  TestValidator.predicate(
    "moderation action has creation time",
    typeof action.created_at === "string" && action.created_at.length > 0,
  );

  // Validate target points to the comment
  TestValidator.predicate(
    "moderation action target exists",
    action.target !== undefined && action.target !== null,
  );
  if (action.target) {
    TestValidator.equals(
      "moderation action target type is comment",
      action.target.target_type,
      "comment",
    );
    TestValidator.equals(
      "moderation action target id matches comment",
      action.target.target_id,
      comment.id,
    );
  }

  // 7) RBAC: non-moderator cannot perform moderation action
  await TestValidator.error(
    "non-moderator cannot take moderation action",
    async () => {
      await api.functional.communityBbs.communityMember.moderation.comments.actions.takeAction(
        nonModConn,
        {
          commentId: comment.id,
          body: {
            moderator_id: null,
            target_comment_id: comment.id,
            action_type: "remove",
            reason_code: "abuse",
            note: "Attempt by non-moderator",
            expires_at: null,
          } satisfies ICommunityBbsModerationAction.ICreate,
        },
      );
    },
  );

  // 8) Edge case: origin_report_id referencing non-existent report -> expect error
  await TestValidator.error(
    "origin_report_id referencing non-existent report should fail",
    async () => {
      await api.functional.communityBbs.communityMember.moderation.comments.actions.takeAction(
        authorConn,
        {
          commentId: comment.id,
          body: {
            moderator_id: null,
            target_comment_id: comment.id,
            action_type: "remove",
            origin_report_id: typia.random<string & tags.Format<"uuid">>(),
            note: "Using non-existent origin_report_id",
            expires_at: null,
          } satisfies ICommunityBbsModerationAction.ICreate,
        },
      );
    },
  );

  // 9) Edge case: expires_at in the past -> expect error
  await TestValidator.error("expires_at in the past should fail", async () => {
    await api.functional.communityBbs.communityMember.moderation.comments.actions.takeAction(
      authorConn,
      {
        commentId: comment.id,
        body: {
          moderator_id: null,
          target_comment_id: comment.id,
          action_type: "remove",
          note: "Expired expiration test",
          expires_at: new Date(Date.now() - 1000 * 60 * 60).toISOString(), // 1 hour in the past
        } satisfies ICommunityBbsModerationAction.ICreate,
      },
    );
  });
}
