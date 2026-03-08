import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import type { ICommunityPlatformCommentSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommentSnapshot";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformSubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformSubscription";
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
import { generate_random_community_platform_member_subscriptions_create } from "../../../generate/generate_random_community_platform_member_subscriptions_create";
import { prepare_random_community_platform_comment } from "../../../prepare/prepare_random_community_platform_comment";
import { prepare_random_community_platform_community } from "../../../prepare/prepare_random_community_platform_community";
import { prepare_random_community_platform_post } from "../../../prepare/prepare_random_community_platform_post";
import { prepare_random_community_platform_subscription } from "../../../prepare/prepare_random_community_platform_subscription";

export async function test_api_comment_snapshot_pagination_large_history(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member authentication
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {});
  // 2. Create community
  const community =
    await generate_random_community_platform_member_communities_create(
      memberConnection,
      {},
    );
  // 3. Subscribe to community (required for posting)
  await generate_random_community_platform_member_subscriptions_create(
    memberConnection,
    {
      body: {
        community_id: community.id,
      },
    },
  );
  // 4. Create post
  const post = await generate_random_community_platform_member_posts_create(
    memberConnection,
    {
      body: {
        communityId: community.id,
        contentType: "text",
        title: RandomGenerator.name(),
        textContent: RandomGenerator.paragraph({ sentences: 3 }),
        linkUrl: null,
        imageUrl: null,
      },
    },
  );
  // 5. Create comment
  const comment =
    await generate_random_community_platform_member_posts_comments_create(
      memberConnection,
      {
        params: {
          postId: post.id,
        },
      },
    );
  // 6. Edit comment 5 times to create 5 snapshots
  const editCount = 5;
  for (let i = 0; i < editCount; i++) {
    const updatedComment =
      await api.functional.communityPlatform.member.posts.comments.update(
        memberConnection,
        {
          postId: post.id,
          commentId: comment.id,
          body: {
            content: RandomGenerator.paragraph({ sentences: 2 }),
          } satisfies ICommunityPlatformComment.IUpdate,
        },
      );
    typia.assert(updatedComment);
  }
  // 7. Test pagination - Page 1 with limit=2
  const page1 = await api.functional.communityPlatform.comments.snapshots.index(
    memberConnection,
    {
      commentId: comment.id,
      body: {
        page: 1,
        limit: 2,
      } satisfies ICommunityPlatformCommentSnapshot.IRequest,
    },
  );
  typia.assert(page1);
  // Verify page 1 metadata
  TestValidator.equals("page 1 - current page", page1.pagination.current, 1);
  TestValidator.equals("page 1 - limit", page1.pagination.limit, 2);
  TestValidator.equals(
    "page 1 - total records",
    page1.pagination.records,
    editCount,
  );
  TestValidator.equals("page 1 - total pages", page1.pagination.pages, 3);
  TestValidator.equals("page 1 - data count", page1.data.length, 2);
  // 8. Test pagination - Page 2 with limit=2
  const page2 = await api.functional.communityPlatform.comments.snapshots.index(
    memberConnection,
    {
      commentId: comment.id,
      body: {
        page: 2,
        limit: 2,
      } satisfies ICommunityPlatformCommentSnapshot.IRequest,
    },
  );
  typia.assert(page2);
  // Verify page 2 metadata
  TestValidator.equals("page 2 - current page", page2.pagination.current, 2);
  TestValidator.equals("page 2 - data count", page2.data.length, 2);
  // 9. Test pagination - Page 3 with limit=2 (last page with remainder)
  const page3 = await api.functional.communityPlatform.comments.snapshots.index(
    memberConnection,
    {
      commentId: comment.id,
      body: {
        page: 3,
        limit: 2,
      } satisfies ICommunityPlatformCommentSnapshot.IRequest,
    },
  );
  typia.assert(page3);
  // Verify page 3 metadata
  TestValidator.equals("page 3 - current page", page3.pagination.current, 3);
  TestValidator.equals("page 3 - data count (remainder)", page3.data.length, 1);
  // 10. Verify ordering across all pages (descending by created_at)
  const allSnapshots = [...page1.data, ...page2.data, ...page3.data];
  for (let i = 0; i < allSnapshots.length - 1; i++) {
    const current = allSnapshots[i];
    const next = allSnapshots[i + 1];
    TestValidator.predicate(
      `snapshot ${i} created before snapshot ${i + 1}`,
      new Date(current.created_at) >= new Date(next.created_at),
    );
  }
  // 11. Verify total snapshots collected
  TestValidator.equals(
    "total snapshots collected",
    allSnapshots.length,
    editCount,
  );
}
