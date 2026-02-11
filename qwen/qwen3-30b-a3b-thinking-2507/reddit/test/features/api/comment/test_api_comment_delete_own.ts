import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityComment";
import type { ICommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityCommunity";
import type { ICommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityMember";
import type { ICommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPost";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_community_member_communities_create } from "../../../generate/generate_random_community_member_communities_create";
import { generate_random_community_member_posts_comments_create } from "../../../generate/generate_random_community_member_posts_comments_create";
import { prepare_random_community_comment } from "../../../prepare/prepare_random_community_comment";
import { prepare_random_community_community } from "../../../prepare/prepare_random_community_community";

export async function test_api_comment_delete_own(
  connection: api.IConnection,
): Promise<void> {
  // 1. User signup and authentication
  const userConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(userConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      username: RandomGenerator.name(),
    },
  });
  // 2. User creates community
  const community = await generate_random_community_member_communities_create(
    userConnection,
    { body: {} },
  );
  // 3. User creates post in community
  const post = await api.functional.community.member.communities.posts.create(
    userConnection,
    {
      communityId: community.id,
      body: {
        title: RandomGenerator.paragraph({ sentences: 1 }),
        type: "text" as const,
        content: RandomGenerator.paragraph({ sentences: 3 }),
      } satisfies ICommunityPost.ICreate,
    },
  );
  // 4. User creates comment on post
  const comment = await generate_random_community_member_posts_comments_create(
    userConnection,
    {
      params: {
        postId: post.id,
      },
    },
  );
  // 5. User deletes comment
  await api.functional.community.member.posts.comments.erase(userConnection, {
    postId: post.id,
    commentId: comment.id,
  });
}
