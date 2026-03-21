import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCloneComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCloneComment";
import type { IRedditCloneComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneComment";
import type { IRedditCloneCommunityBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunityBan";
import type { IRedditCloneFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFile";
import type { IRedditCloneFileAssociation } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFileAssociation";
import type { IRedditCloneMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMemberSession";
import type { IRedditClonePostLink } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePostLink";
import type { IRedditClonePostTextContent } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePostTextContent";
import type { IRedditCloneUserKarma } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneUserKarma";
import type { IRedditCloneUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneUserProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_clone_member_communities_create } from "../../../generate/generate_random_reddit_clone_member_communities_create";
import { generate_random_reddit_clone_member_posts_comments_create } from "../../../generate/generate_random_reddit_clone_member_posts_comments_create";
import { generate_random_reddit_clone_member_posts_create } from "../../../generate/generate_random_reddit_clone_member_posts_create";
import { generate_random_reddit_clone_member_subscriptions_create } from "../../../generate/generate_random_reddit_clone_member_subscriptions_create";
import { prepare_random_reddit_clone_comment } from "../../../prepare/prepare_random_reddit_clone_comment";
import { prepare_random_reddit_clone_community_ban } from "../../../prepare/prepare_random_reddit_clone_community_ban";
import { prepare_random_reddit_clone_post_link } from "../../../prepare/prepare_random_reddit_clone_post_link";
import { prepare_random_reddit_clone_post_text_content } from "../../../prepare/prepare_random_reddit_clone_post_text_content";

export async function test_api_post_comments_sorted_by_best(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as a member
  const memberConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_member_join(memberConnection, {});
  typia.assert(authorized);
  // 2. Create a community
  const community =
    await generate_random_reddit_clone_member_communities_create(
      memberConnection,
      {},
    );
  typia.assert(community);
  // 3. Subscribe to the community
  const subscription =
    await generate_random_reddit_clone_member_subscriptions_create(
      memberConnection,
      {
        body: {
          community_id: community.id,
        } satisfies IRedditClonePostTextContent.ICreate,
      },
    );
  typia.assert(subscription);
  // 4. Create a post within the community
  const post = await generate_random_reddit_clone_member_posts_create(
    memberConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 1 }),
        communityName: community.name,
        type: "text",
      } satisfies IRedditClonePostLink.ICreate,
    },
  );
  typia.assert(post);
  // 5. Create multiple comments with varying content
  const commentCount = 5;
  const comments = await ArrayUtil.asyncRepeat(commentCount, async (index) => {
    const comment =
      await generate_random_reddit_clone_member_posts_comments_create(
        memberConnection,
        {
          params: { postId: post.id },
          body: {
            content: `Comment ${index}: ${RandomGenerator.paragraph({ sentences: 1 })}`,
          } satisfies IRedditCloneComment.ICreate,
        },
      );
    typia.assert(comment);
    return comment;
  });
  // 6. Call the target endpoint with sortBy='best' and pagination
  const limit = 3;
  const response = await api.functional.redditClone.member.posts.comments.index(
    memberConnection,
    {
      postId: post.id,
      body: {
        sortBy: "best",
        page: 1,
        limit: limit,
      } satisfies IRedditCloneComment.IRequest,
    },
  );
  typia.assert(response);
  // 7. Validate response structure
  TestValidator.equals("has pagination", response.pagination !== null, true);
  TestValidator.equals("has data", response.data !== null, true);
  TestValidator.equals(
    "pagination has current page",
    typeof response.pagination.current === "number",
    true,
  );
  TestValidator.equals(
    "pagination has limit",
    response.pagination.limit === limit,
    true,
  );
  TestValidator.equals(
    "pagination has records",
    typeof response.pagination.records === "number",
    true,
  );
  TestValidator.equals(
    "pagination has pages",
    typeof response.pagination.pages === "number",
    true,
  );
  // 8. Validate comment structure in response
  for (const comment of response.data) {
    TestValidator.equals(
      "comment has id",
      typeof comment.id === "string",
      true,
    );
    TestValidator.equals(
      "comment has content",
      typeof comment.content === "string",
      true,
    );
    TestValidator.equals(
      "comment has vote_score",
      typeof comment.vote_score === "number",
      true,
    );
    TestValidator.equals(
      "comment has created_at",
      typeof comment.created_at === "string",
      true,
    );
    TestValidator.equals(
      "comment has updated_at",
      typeof comment.updated_at === "string",
      true,
    );
    TestValidator.equals(
      "comment has parent_comment_id",
      comment.parent_comment_id === null,
      true,
    );
    TestValidator.equals("comment has author", comment.author !== null, true);
    TestValidator.equals(
      "comment has post reference",
      comment.post !== null,
      true,
    );
  }
  // 9. Validate sorting - comments should be sorted by vote_score descending
  if (response.data.length > 1) {
    for (let i = 0; i < response.data.length - 1; i++) {
      TestValidator.predicate(
        `comment ${i} vote_score (${response.data[i].vote_score}) >= comment ${i + 1} vote_score (${response.data[i + 1].vote_score})`,
        response.data[i].vote_score >= response.data[i + 1].vote_score,
      );
    }
  }
}
