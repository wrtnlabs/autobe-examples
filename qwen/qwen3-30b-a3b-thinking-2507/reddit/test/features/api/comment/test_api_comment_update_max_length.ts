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

export async function test_api_comment_update_max_length(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register as community member
  const memberConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      username: RandomGenerator.name(),
    },
  });
  // 2. Create a community
  const community = await api.functional.community.member.communities.create(
    memberConnection,
    {
      body: {
        name: RandomGenerator.name(),
        description: RandomGenerator.paragraph({ sentences: 1 }),
      },
    },
  );
  // 3. Create a post within the community
  const post = await api.functional.community.member.communities.posts.create(
    memberConnection,
    {
      communityId: community.id,
      body: {
        title: RandomGenerator.name(),
        content: RandomGenerator.paragraph({ sentences: 3 }),
        type: "text",
      },
    },
  );
  // 4. Create a comment on the post
  const comment = await api.functional.community.member.posts.comments.create(
    memberConnection,
    {
      postId: post.id,
      body: {
        content: "Initial comment content",
      },
    },
  );
  // 5. Update the comment with exactly 5000 characters
  const exactly5000Chars = RandomGenerator.paragraph().substring(0, 5000);
  const updatedComment =
    await api.functional.community.member.posts.comments.update(
      memberConnection,
      {
        postId: post.id,
        commentId: comment.id,
        body: {
          content: exactly5000Chars,
        },
      },
    );
  typia.assert(updatedComment);
  // 6. Validate the update
  TestValidator.equals(
    "content matches",
    updatedComment.content,
    exactly5000Chars,
  );
  TestValidator.predicate(
    "updated_at is valid",
    updatedComment.updated_at !== undefined &&
      updatedComment.updated_at !== null,
  );
}
