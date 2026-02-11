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

export async function test_api_comment_fetch_valid(
  connection: api.IConnection,
): Promise<void> {
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      username: RandomGenerator.name(),
    },
  });
  const community = await generate_random_community_member_communities_create(
    memberConnection,
    {
      body: {
        name: RandomGenerator.name(3),
        description: RandomGenerator.paragraph({ sentences: 1 }),
      },
    },
  );
  const post = await api.functional.community.member.communities.posts.create(
    memberConnection,
    {
      communityId: community.id,
      body: {
        title: RandomGenerator.paragraph({ sentences: 1 }),
        type: "text",
        content: RandomGenerator.content({
          paragraphs: 1,
          sentenceMin: 1,
          wordMin: 3,
        }),
      } satisfies ICommunityPost.ICreate,
    },
  );
  typia.assert(post);
  const comment = await api.functional.community.member.posts.comments.create(
    memberConnection,
    {
      postId: post.id,
      body: {
        content: RandomGenerator.paragraph({ sentences: 1 }),
      } satisfies ICommunityComment.ICreate,
    },
  );
  typia.assert(comment);
  const retrievedComment = await api.functional.community.posts.comments.at(
    memberConnection,
    {
      postId: post.id,
      commentId: comment.id,
    },
  );
  typia.assert(retrievedComment);
  TestValidator.equals("comment ID matches", retrievedComment.id, comment.id);
  TestValidator.equals(
    "comment content matches",
    retrievedComment.content,
    comment.content,
  );
}
