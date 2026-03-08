import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformComment";
import type { IRedditPlatformCommentEdit } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommentEdit";
import type { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import type { IRedditPlatformCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunitySubscription";
import type { IRedditPlatformFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformFile";
import type { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import type { IRedditPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPost";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_platform_member_communities_create } from "../../../generate/generate_random_reddit_platform_member_communities_create";
import { generate_random_reddit_platform_member_posts_comments_create } from "../../../generate/generate_random_reddit_platform_member_posts_comments_create";
import { generate_random_reddit_platform_member_posts_create } from "../../../generate/generate_random_reddit_platform_member_posts_create";
import { prepare_random_reddit_platform_comment } from "../../../prepare/prepare_random_reddit_platform_comment";
import { prepare_random_reddit_platform_community } from "../../../prepare/prepare_random_reddit_platform_community";
import { prepare_random_reddit_platform_post } from "../../../prepare/prepare_random_reddit_platform_post";

export async function test_api_comment_edit_history_unauthorized_access(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create authorized member who will create and edit the comment
  const authorizedMemberConnection: api.IConnection = { host: connection.host };
  const authorizedMember = await authorize_member_join(
    authorizedMemberConnection,
    {
      body: typia.assert<IRedditPlatformMember.IJoin>({
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        username: RandomGenerator.name(1),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      }),
    },
  );
  typia.assert(authorizedMember);
  // 2. Create community
  const community =
    await api.functional.redditPlatform.member.communities.create(
      authorizedMemberConnection,
      {
        body: {
          name: RandomGenerator.name(1),
          description: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies IRedditPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);
  // 3. Create post in the community
  const post = await api.functional.redditPlatform.member.posts.create(
    authorizedMemberConnection,
    {
      body: {
        community_id: community.id,
        title: RandomGenerator.paragraph({ sentences: 1 }),
        post_type: "text",
        text_content: RandomGenerator.paragraph({ sentences: 5 }),
      } satisfies IRedditPlatformPost.ICreate,
    },
  );
  typia.assert(post);
  // 4. Create comment
  const comment =
    await api.functional.redditPlatform.member.posts.comments.create(
      authorizedMemberConnection,
      {
        postId: post.id,
        body: {
          body: RandomGenerator.paragraph({ sentences: 3 }),
        } satisfies IRedditPlatformComment.ICreate,
      },
    );
  typia.assert(comment);
  // 5. Edit comment to create edit history record
  const updatedComment =
    await api.functional.redditPlatform.member.posts.comments.update(
      authorizedMemberConnection,
      {
        postId: post.id,
        commentId: comment.id,
        body: {
          body: RandomGenerator.paragraph({ sentences: 5 }),
        } satisfies IRedditPlatformComment.IUpdate,
      },
    );
  typia.assert(updatedComment);
  // 6. Create unauthorized member
  const unauthorizedMemberConnection: api.IConnection = {
    host: connection.host,
  };
  const unauthorizedMember = await authorize_member_join(
    unauthorizedMemberConnection,
    {
      body: typia.assert<IRedditPlatformMember.IJoin>({
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        username: RandomGenerator.name(1),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      }),
    },
  );
  typia.assert(unauthorizedMember);
  // 7. Unauthorized member subscribes to community (required to access post)
  await api.functional.redditPlatform.member.communities.subscriptions.create(
    unauthorizedMemberConnection,
    {
      communityId: community.id,
    },
  );
  // 8. Unauthorized member attempts to access edit history - should fail with 403
  // Use a valid UUID format for editId - the authorization check happens before resource verification
  const editId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.httpError(
    "unauthorized member cannot access edit history",
    403,
    async () =>
      await api.functional.redditPlatform.member.posts.comments.edit_histories.at(
        unauthorizedMemberConnection,
        {
          postId: post.id,
          commentId: comment.id,
          editId: editId,
        },
      ),
  );
}