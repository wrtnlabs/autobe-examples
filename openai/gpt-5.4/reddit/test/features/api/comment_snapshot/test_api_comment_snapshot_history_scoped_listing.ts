import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import type { ICommunityPlatformCommentSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommentSnapshot";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformPostImage } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostImage";
import type { ICommunityPlatformPostLink } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostLink";
import type { ICommunityPlatformPostText } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostText";
import type { ICommunityPlatformProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformProfile";
import type { ICommunityPlatformProfileFile } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformProfileFile";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformCommentSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformCommentSnapshot";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_community_platform_member_communities_create } from "../../../generate/generate_random_community_platform_member_communities_create";
import { generate_random_community_platform_member_posts_comments_create } from "../../../generate/generate_random_community_platform_member_posts_comments_create";
import { generate_random_community_platform_member_posts_create } from "../../../generate/generate_random_community_platform_member_posts_create";
import { prepare_random_community_platform_comment } from "../../../prepare/prepare_random_community_platform_comment";
import { prepare_random_community_platform_community } from "../../../prepare/prepare_random_community_platform_community";
import { prepare_random_community_platform_post } from "../../../prepare/prepare_random_community_platform_post";
import { prepare_random_community_platform_post_image } from "../../../prepare/prepare_random_community_platform_post_image";
import { prepare_random_community_platform_post_link } from "../../../prepare/prepare_random_community_platform_post_link";
import { prepare_random_community_platform_post_text } from "../../../prepare/prepare_random_community_platform_post_text";

export async function test_api_comment_snapshot_history_scoped_listing(
  connection: api.IConnection,
): Promise<void> {
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies ICommunityPlatformMember.IJoin,
  });
  const community =
    await generate_random_community_platform_member_communities_create(
      memberConnection,
      {
        body: {
          slug: `community-${RandomGenerator.alphabets(8)}`,
          title: RandomGenerator.name(),
          description: RandomGenerator.paragraph({ sentences: 6 }),
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert<ICommunityPlatformCommunity>(community);
  const post = await generate_random_community_platform_member_posts_create(
    memberConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 3 }),
        community_platform_community_id: community.id,
        post_type: "text",
        textContent: {
          body: RandomGenerator.content({ paragraphs: 2 }),
        } satisfies ICommunityPlatformPostText.ICreate,
      } satisfies ICommunityPlatformPost.ICreate,
    },
  );
  typia.assert<ICommunityPlatformPost>(post);
  const comment =
    await generate_random_community_platform_member_posts_comments_create(
      memberConnection,
      {
        params: {
          postId: post.id,
        },
        body: {
          body: RandomGenerator.paragraph({ sentences: 5 }),
          parentId: null,
        } satisfies ICommunityPlatformComment.ICreate,
      },
    );
  typia.assert<ICommunityPlatformComment>(comment);
  const commentEntity = typia.assert<IEntity>(comment);
  const request = {
    page: 1,
    limit: 10,
    sort: "-created_at",
  } satisfies ICommunityPlatformCommentSnapshot.IRequest;
  const beforePostId = post.id;
  const beforeCommentId = commentEntity.id;
  const history =
    await api.functional.communityPlatform.member.posts.comments.snapshots.index(
      memberConnection,
      {
        postId: post.id,
        commentId: commentEntity.id,
        body: request,
      },
    );
  typia.assert<IPageICommunityPlatformCommentSnapshot.ISummary>(history);
  TestValidator.equals(
    "requested page reflected in pagination",
    history.pagination.current,
    request.page,
  );
  TestValidator.equals(
    "requested limit reflected in pagination",
    history.pagination.limit,
    request.limit,
  );
  TestValidator.predicate(
    "record count is non-negative",
    history.pagination.records >= 0,
  );
  TestValidator.predicate(
    "page count is non-negative",
    history.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "returned items do not exceed limit",
    history.data.length <= history.pagination.limit,
  );
  TestValidator.predicate(
    "history payload is not the current comment payload",
    history !== comment,
  );
  TestValidator.equals("post id preserved across read", beforePostId, post.id);
  TestValidator.equals(
    "comment id preserved across read",
    beforeCommentId,
    commentEntity.id,
  );
  for (const item of history.data) {
    typia.assert<ICommunityPlatformCommentSnapshot.ISummary>(item);
    const scopedComment = typia.assert<IEntity>(item.comment);
    TestValidator.equals(
      "snapshot item belongs to requested comment",
      scopedComment.id,
      commentEntity.id,
    );
  }
  for (let i = 1; i < history.data.length; ++i) {
    const previous = history.data[i - 1];
    const current = history.data[i];
    TestValidator.predicate(
      "newest-first ordering is deterministic by descending snapshot id",
      previous.id >= current.id,
    );
  }
}
