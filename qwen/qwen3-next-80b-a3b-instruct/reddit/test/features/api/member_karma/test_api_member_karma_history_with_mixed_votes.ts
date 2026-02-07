import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityComment";
import type { ICommunityKarmaScore } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityKarmaScore";
import type { ICommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityMember";
import type { ICommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPost";
import type { ICommunityPostVote } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPostVote";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityKarmaScore } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityKarmaScore";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_community_member_comments_create } from "../../../generate/generate_random_community_member_comments_create";
import { generate_random_community_member_posts_create } from "../../../generate/generate_random_community_member_posts_create";
import { generate_random_community_member_votes_create } from "../../../generate/generate_random_community_member_votes_create";
import { prepare_random_community_comment } from "../../../prepare/prepare_random_community_comment";
import { prepare_random_community_post } from "../../../prepare/prepare_random_community_post";
import { prepare_random_community_post_vote } from "../../../prepare/prepare_random_community_post_vote";

export async function test_api_member_karma_history_with_mixed_votes(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member account
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "securePassword123",
    } satisfies ICommunityMember.IJoin,
  });
  // 2. Create 3 posts for upvotes
  const postIds: string[] = [];
  const postCount = 3;
  for (let i = 0; i < postCount; i++) {
    const post = await generate_random_community_member_posts_create(
      memberConnection,
      {
        body: {
          title: RandomGenerator.paragraph({ sentences: 1 }),
          content_type: "text",
          content: RandomGenerator.content({ paragraphs: 2 }),
        } satisfies ICommunityPost.ICreate,
      },
    );
    const safePost = typia.assert<IEntity & ICommunityPost>(post);
    postIds.push(safePost.id);
  }
  // 3. Create 3 comments for downvotes
  const commentIds: string[] = [];
  const commentCount = 3;
  for (let i = 0; i < commentCount; i++) {
    const comment = await generate_random_community_member_comments_create(
      memberConnection,
      {
        body: {
          content: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies ICommunityComment.ICreate,
      },
    );
    const safeComment = typia.assert<IEntity & ICommunityComment>(comment);
    commentIds.push(safeComment.id);
  }
  // 4. Create 5 upvotes on posts (2 posts get 2 upvotes each, 1 post gets 1 upvote)
  const upvoteCount = 5;
  const upvotePosts = [
    postIds[0],
    postIds[0],
    postIds[1],
    postIds[1],
    postIds[2],
  ];
  const upvoteConnections: api.IConnection[] = [];
  for (let i = 0; i < upvoteCount; i++) {
    const upvoteConnection: api.IConnection = { host: connection.host };
    await authorize_member_join(upvoteConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "securePassword123",
      } satisfies ICommunityMember.IJoin,
    });
    await generate_random_community_member_votes_create(upvoteConnection, {
      body: {
        target_id: upvotePosts[i],
        vote_type: "upvote",
      } satisfies ICommunityPostVote.ICreate,
    });
    upvoteConnections.push(upvoteConnection);
  }
  // 5. Create 3 downvotes on comments (1 comment gets 2 downvotes, 1 comment gets 1 downvote)
  const downvoteCount = 3;
  const downvoteComments = [commentIds[0], commentIds[0], commentIds[1]];
  const downvoteConnections: api.IConnection[] = [];
  for (let i = 0; i < downvoteCount; i++) {
    const downvoteConnection: api.IConnection = { host: connection.host };
    await authorize_member_join(downvoteConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "securePassword123",
      } satisfies ICommunityMember.IJoin,
    });
    await generate_random_community_member_votes_create(downvoteConnection, {
      body: {
        target_id: downvoteComments[i],
        vote_type: "downvote",
      } satisfies ICommunityPostVote.ICreate,
    });
    downvoteConnections.push(downvoteConnection);
  }
  // 6. Access karma history
  const karmaHistory =
    await api.functional.community.member.karma.at(memberConnection);
  typia.assert(karmaHistory);
  // 7. Validate pagination structure
  TestValidator.equals(
    "pagination current page",
    karmaHistory.pagination.current,
    1,
  );
  TestValidator.equals("pagination limit", karmaHistory.pagination.limit, 20);
  TestValidator.equals("total records", karmaHistory.pagination.records, 8);
  TestValidator.equals("total pages", karmaHistory.pagination.pages, 1);
  // 8. Validate that we have 8 karma history records (5 upvotes + 3 downvotes)
  // Note: ICommunityKarmaScore is an empty object {}, so we cannot validate its properties
  // We can only validate the count and structure of the response array
  TestValidator.equals("karma history count", karmaHistory.data.length, 8);
}
