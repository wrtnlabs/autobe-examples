import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import type { ICommunityPlatformCommentSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommentSnapshot";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformFile } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformFile";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformPostAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostAttachment";
import type { ICommunityPlatformPostLink } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostLink";
import type { ICommunityPlatformPostText } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostText";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_community_platform_comment_snapshots_create } from "../../../generate/generate_random_community_platform_comment_snapshots_create";
import { generate_random_community_platform_member_communities_create } from "../../../generate/generate_random_community_platform_member_communities_create";
import { generate_random_community_platform_member_posts_comments_create } from "../../../generate/generate_random_community_platform_member_posts_comments_create";
import { generate_random_community_platform_member_posts_create } from "../../../generate/generate_random_community_platform_member_posts_create";
import { prepare_random_community_platform_comment } from "../../../prepare/prepare_random_community_platform_comment";
import { prepare_random_community_platform_comment_snapshot } from "../../../prepare/prepare_random_community_platform_comment_snapshot";
import { prepare_random_community_platform_community } from "../../../prepare/prepare_random_community_platform_community";
import { prepare_random_community_platform_post } from "../../../prepare/prepare_random_community_platform_post";
import { prepare_random_community_platform_post_attachment } from "../../../prepare/prepare_random_community_platform_post_attachment";
import { prepare_random_community_platform_post_link } from "../../../prepare/prepare_random_community_platform_post_link";
import { prepare_random_community_platform_post_text } from "../../../prepare/prepare_random_community_platform_post_text";

/**
 * Test the creation of a comment snapshot when a member edits their comment.
 * This scenario validates the audit trail functionality for comment edits,
 * ensuring that historical versions are preserved.
 */
export async function test_api_comment_snapshot_creation_when_member_edits_comment(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member account and authenticate
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {});
  typia.assert(member);
  // 2. Create community
  const community =
    await generate_random_community_platform_member_communities_create(
      memberConnection,
      {
        body: {
          name: RandomGenerator.alphaNumeric(10).toLowerCase(),
          description: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies DeepPartial<ICommunityPlatformCommunity.ICreate>,
      },
    );
  typia.assert(community);
  // 3. Create text post in community
  const post = await generate_random_community_platform_member_posts_create(
    memberConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 1 }),
        community_name: community.name,
        content_type: "TEXT" as const,
        content_text: {
          content: RandomGenerator.paragraph({ sentences: 3 }),
          formatting: "plain",
        } satisfies ICommunityPlatformPostText.ICreate,
      } satisfies DeepPartial<ICommunityPlatformPost.ICreate>,
    },
  );
  typia.assert(post);
  // 4. Create comment on the post
  const comment =
    await generate_random_community_platform_member_posts_comments_create(
      memberConnection,
      {
        body: {
          content: RandomGenerator.paragraph({ sentences: 1 }),
        } satisfies DeepPartial<ICommunityPlatformComment.ICreate>,
        params: {
          postId: post.id,
        },
      },
    );
  typia.assert(comment);
  // 5. Create comment snapshot with status 'edited'
  const snapshotBody = {
    comment_id: comment.id,
    editor_id: member.id,
    status: "edited" as const,
    body: comment.content,
    parent_comment_id: null,
    post_id: post.id,
  } satisfies DeepPartial<ICommunityPlatformCommentSnapshot.ICreate>;
  const snapshot =
    await generate_random_community_platform_comment_snapshots_create(
      memberConnection,
      {
        body: snapshotBody,
      },
    );
  typia.assert(snapshot);
  // 6. Validate snapshot
  TestValidator.equals("snapshot status is edited", snapshot.status, "edited");
  TestValidator.equals(
    "snapshot body matches comment content",
    snapshot.body,
    comment.content,
  );
  TestValidator.equals(
    "snapshot comment reference",
    snapshot.comment.id,
    comment.id,
  );
  TestValidator.equals(
    "snapshot editor reference",
    snapshot.editor?.id,
    member.id,
  );
  TestValidator.equals("snapshot post reference", snapshot.post.id, post.id);
  TestValidator.predicate(
    "snapshot has creation timestamp",
    () => new Date(snapshot.created_at).getTime() > 0,
  );
}
