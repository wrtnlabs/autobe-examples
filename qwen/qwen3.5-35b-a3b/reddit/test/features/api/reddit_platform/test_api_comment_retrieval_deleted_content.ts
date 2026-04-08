import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformComment";
import type { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import type { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import type { IRedditPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPost";
import type { IRedditPlatformPostImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPostImage";
import type { IRedditPlatformPostLink } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPostLink";
import type { IRedditPlatformPostText } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPostText";
import type { IRedditPlatformPostVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPostVote";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_platform_member_comments_create } from "../../../generate/generate_random_reddit_platform_member_comments_create";
import { generate_random_reddit_platform_member_communities_create } from "../../../generate/generate_random_reddit_platform_member_communities_create";
import { prepare_random_reddit_platform_comment } from "../../../prepare/prepare_random_reddit_platform_comment";
import { prepare_random_reddit_platform_community } from "../../../prepare/prepare_random_reddit_platform_community";

export async function test_api_comment_retrieval_deleted_content(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register member account
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      href: "http://localhost:3000/register" satisfies string &
        tags.Format<"uri">,
      referrer: "http://localhost:3000" satisfies string & tags.Format<"uri">,
    },
  });
  typia.assert(memberAuth);
  // 2. Create community
  const communityConnection: api.IConnection = { host: connection.host };
  const community =
    await generate_random_reddit_platform_member_communities_create(
      communityConnection,
      {
        body: {
          name: RandomGenerator.alphaNumeric(10) + "_community",
          description: "Test community for deleted comment retrieval test",
        },
      },
    );
  typia.assert(community);
  // 3. Create post in community
  const postConnection: api.IConnection = { host: connection.host };
  const post = await api.functional.redditPlatform.member.posts.create(
    postConnection,
    {
      body: {
        community_id: community.id,
        title: RandomGenerator.paragraph({ sentences: 3 }),
        post_type: "text" as const,
        text_content: RandomGenerator.content({ paragraphs: 2 }),
      },
    },
  );
  typia.assert(post);
  // 4. Create comment on post
  const commentConnection: api.IConnection = { host: connection.host };
  const comment = await generate_random_reddit_platform_member_comments_create(
    commentConnection,
    {
      body: {
        reddit_platform_post_id: post.id,
        content: RandomGenerator.paragraph({ sentences: 2 }),
      },
    },
  );
  typia.assert(comment);
  // 5. Delete the comment
  const deleteConnection: api.IConnection = { host: connection.host };
  await api.functional.redditPlatform.member.comments.erase(deleteConnection, {
    commentId: comment.id,
  });
  // 6. Attempt to retrieve deleted comment - expect 404 Not Found
  const getCommentConnection: api.IConnection = { host: connection.host };
  await TestValidator.httpError(
    "deleted comment should return 404 Not Found",
    404,
    async () => {
      await api.functional.redditPlatform.posts.comments.at(
        getCommentConnection,
        {
          postId: post.id,
          commentId: comment.id,
        },
      );
    },
  );
}
