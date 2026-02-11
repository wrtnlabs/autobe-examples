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

export async function test_api_comment_update_min_length(
  connection: api.IConnection,
): Promise<void> {
  // Register a new member
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      username: RandomGenerator.name(),
    },
  });
  const memberAuthValidated = typia.assert(memberAuth);
  // Create a new community
  const community = await generate_random_community_member_communities_create(
    memberConnection,
    {
      body: {
        name: RandomGenerator.name(2),
        description: RandomGenerator.paragraph({ sentences: 1 }),
      },
    },
  );
  const communityValidated = typia.assert(community);
  // Create a new post in the community
  const post = await api.functional.community.member.communities.posts.create(
    memberConnection,
    {
      communityId: communityValidated.id,
      body: {
        title: RandomGenerator.paragraph({ sentences: 1 }),
        type: "text",
        content: RandomGenerator.paragraph({ sentences: 2 }),
      },
    },
  );
  const postValidated = typia.assert(post);
  // Create a comment on the post
  const comment = await generate_random_community_member_posts_comments_create(
    memberConnection,
    {
      body: {
        content: "This is an initial comment.",
      },
      params: {
        postId: postValidated.id,
      },
    },
  );
  const commentValidated = typia.assert(comment);
  // Update the comment to exactly 1 character
  const updatedComment =
    await api.functional.community.member.posts.comments.update(
      memberConnection,
      {
        postId: postValidated.id,
        commentId: commentValidated.id,
        body: {
          content: "a",
        } satisfies ICommunityComment.IUpdate,
      },
    );
  const updatedCommentValidated = typia.assert(updatedComment);
  // Verify the comment was updated correctly
  TestValidator.equals(
    "comment content updated",
    updatedCommentValidated.content,
    "a",
  );
  TestValidator.predicate(
    "updated timestamp present",
    updatedCommentValidated.updated_at !== undefined,
  );
  TestValidator.predicate(
    "content length is exactly 1",
    updatedCommentValidated.content.length === 1,
  );
}
