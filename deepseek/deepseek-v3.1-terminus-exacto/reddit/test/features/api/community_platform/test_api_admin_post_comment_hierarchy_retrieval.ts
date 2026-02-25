import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformComment";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";
import { generate_random_community_platform_user_communities_create } from "../../../generate/generate_random_community_platform_user_communities_create";
import { generate_random_community_platform_user_posts_create } from "../../../generate/generate_random_community_platform_user_posts_create";
import { prepare_random_community_platform_community } from "../../../prepare/prepare_random_community_platform_community";
import { prepare_random_community_platform_post } from "../../../prepare/prepare_random_community_platform_post";

export async function test_api_admin_post_comment_hierarchy_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as admin
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      permissions_level: null,
    } satisfies ICommunityPlatformAdmin.IJoin,
  });
  // 2. Create a community
  const community =
    await generate_random_community_platform_user_communities_create(
      adminConnection,
      {
        body: {
          name: RandomGenerator.alphabets(10),
          description: RandomGenerator.paragraph({ sentences: 2 }),
          icon_url: null,
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);
  // 3. Create a post
  const post = await generate_random_community_platform_user_posts_create(
    adminConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 1 }),
        community_name: community.name,
        post_type: "text",
        text_content: RandomGenerator.paragraph({ sentences: 3 }),
      } satisfies ICommunityPlatformPost.ICreate,
    },
  );
  typia.assert(post);
  // 4. Retrieve comment hierarchy (comments may exist from previous tests)
  const hierarchy =
    await api.functional.communityPlatform.admin.posts.comments.hierarchy.invert(
      adminConnection,
      {
        postId: post.id,
      },
    );
  typia.assert(hierarchy);
  // 5. Validate hierarchy structure
  TestValidator.predicate("hierarchy response is valid", hierarchy !== null);
  TestValidator.predicate(
    "pagination exists",
    hierarchy.pagination !== undefined,
  );
  // Validate pagination structure
  TestValidator.equals("current page", hierarchy.pagination.current >= 0, true);
  TestValidator.equals(
    "limit is non-negative",
    hierarchy.pagination.limit >= 0,
    true,
  );
  TestValidator.equals(
    "records count",
    hierarchy.pagination.records >= 0,
    true,
  );
  TestValidator.equals("pages count", hierarchy.pagination.pages >= 0, true);
  // Validate comment data structure for each comment in the hierarchy
  if (hierarchy.data.length > 0) {
    for (const comment of hierarchy.data) {
      TestValidator.predicate("comment has id", comment.id !== undefined);
      TestValidator.predicate(
        "comment has content",
        comment.content !== undefined,
      );
      TestValidator.predicate(
        "comment has author",
        comment.author !== undefined,
      );
      TestValidator.predicate("comment has post", comment.post !== undefined);
      TestValidator.predicate(
        "comment has vote_score",
        typeof comment.vote_score === "number",
      );
      TestValidator.predicate(
        "comment has replies_count",
        typeof comment.replies_count === "number",
      );
      TestValidator.predicate(
        "comment has created_at",
        comment.created_at !== undefined,
      );
      // Validate author structure
      TestValidator.predicate("author has id", comment.author.id !== undefined);
      TestValidator.predicate(
        "author has username",
        comment.author.username !== undefined,
      );
      TestValidator.predicate(
        "author has display_name",
        comment.author.display_name !== null,
      );
      TestValidator.predicate(
        "author has avatar_url",
        comment.author.avatar_url !== null,
      );
      TestValidator.predicate(
        "author has karma",
        typeof comment.author.karma === "number",
      );
      TestValidator.predicate(
        "author has created_at",
        comment.author.created_at !== undefined,
      );
      // Validate post structure
      TestValidator.predicate("post has id", comment.post.id !== undefined);
      TestValidator.predicate(
        "post has title",
        comment.post.title !== undefined,
      );
      TestValidator.predicate(
        "post has post_type",
        comment.post.post_type !== undefined,
      );
      TestValidator.predicate(
        "post has author",
        comment.post.author !== undefined,
      );
      TestValidator.predicate(
        "post has community",
        comment.post.community !== undefined,
      );
      TestValidator.predicate(
        "post has created_at",
        comment.post.created_at !== undefined,
      );
      // Validate parent comment structure if exists
      if (comment.parent !== null) {
        TestValidator.predicate(
          "parent has id",
          comment.parent.id !== undefined,
        );
        TestValidator.predicate(
          "parent has content",
          comment.parent.content !== undefined,
        );
        TestValidator.predicate(
          "parent has author",
          comment.parent.author !== undefined,
        );
        TestValidator.predicate(
          "parent has post",
          comment.parent.post !== undefined,
        );
        TestValidator.predicate(
          "parent has vote_score",
          typeof comment.parent.vote_score === "number",
        );
        TestValidator.predicate(
          "parent has created_at",
          comment.parent.created_at !== undefined,
        );
      }
    }
  }
}
