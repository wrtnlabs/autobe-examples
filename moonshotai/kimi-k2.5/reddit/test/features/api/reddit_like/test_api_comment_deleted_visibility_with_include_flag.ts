import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditLikeComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditLikeComment";
import type { IRedditLikeAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeAttachment";
import type { IRedditLikeComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeComment";
import type { IRedditLikeCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunity";
import type { IRedditLikeCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunitySubscription";
import type { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import type { IRedditLikePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikePost";
import type { IRedditLikePostImageContent } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikePostImageContent";
import type { IRedditLikePostLinkContent } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikePostLinkContent";
import type { IRedditLikePostTextContent } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikePostTextContent";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_like_member_communities_create } from "../../../generate/generate_random_reddit_like_member_communities_create";
import { generate_random_reddit_like_member_posts_comments_create } from "../../../generate/generate_random_reddit_like_member_posts_comments_create";
import { generate_random_reddit_like_member_posts_create } from "../../../generate/generate_random_reddit_like_member_posts_create";
import { prepare_random_reddit_like_comment } from "../../../prepare/prepare_random_reddit_like_comment";
import { prepare_random_reddit_like_community } from "../../../prepare/prepare_random_reddit_like_community";
import { prepare_random_reddit_like_post } from "../../../prepare/prepare_random_reddit_like_post";

export async function test_api_comment_deleted_visibility_with_include_flag(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as member A
  const memberAConnection: api.IConnection = { host: connection.host };
  const memberA = await authorize_member_join(memberAConnection, { body: {} });
  typia.assert(memberA);
  // 2. Create community as member A
  const community = await generate_random_reddit_like_member_communities_create(
    memberAConnection,
    { body: {} },
  );
  typia.assert(community);
  // 3. Subscribe member A to community
  await api.functional.redditLike.member.communities.subscriptions.create(
    memberAConnection,
    { communityId: community.id },
  );
  // 4. Create post as member A
  const post = await generate_random_reddit_like_member_posts_create(
    memberAConnection,
    { body: { community_id: community.id } },
  );
  typia.assert(post);
  // 5. Create comment as member A
  const memberAComment =
    await generate_random_reddit_like_member_posts_comments_create(
      memberAConnection,
      {
        params: { postId: post.id },
        body: {
          content: "Member A comment",
        } satisfies IRedditLikeComment.ICreate,
      },
    );
  typia.assert(memberAComment);
  // 6. Delete member A's comment
  await api.functional.redditLike.member.posts.comments.erase(
    memberAConnection,
    {
      postId: post.id,
      commentId: memberAComment.id,
    },
  );
  // 7. Create member B
  const memberBConnection: api.IConnection = { host: connection.host };
  const memberB = await authorize_member_join(memberBConnection, { body: {} });
  typia.assert(memberB);
  // 8. Subscribe member B to same community
  await api.functional.redditLike.member.communities.subscriptions.create(
    memberBConnection,
    { communityId: community.id },
  );
  // 9. Create comment as member B
  const memberBComment =
    await generate_random_reddit_like_member_posts_comments_create(
      memberBConnection,
      {
        params: { postId: post.id },
        body: {
          content: "Member B comment",
        } satisfies IRedditLikeComment.ICreate,
      },
    );
  typia.assert(memberBComment);
  // 10. Delete member B's comment
  await api.functional.redditLike.member.posts.comments.erase(
    memberBConnection,
    {
      postId: post.id,
      commentId: memberBComment.id,
    },
  );
  // 11. As member A, list comments with includeDeleted: false
  const commentsWithoutDeleted =
    await api.functional.redditLike.member.comments.index(memberAConnection, {
      body: {
        sort: "NEW",
        page: 1,
        limit: 100,
        search: null,
        authorId: null,
        parentId: null,
        includeDeleted: false,
      } satisfies IRedditLikeComment.IRequest,
    });
  typia.assert(commentsWithoutDeleted);
  // Verify neither deleted comment is visible
  const memberADeletedInExclude = commentsWithoutDeleted.data.find(
    (c) => c.id === memberAComment.id,
  );
  const memberBDeletedInExclude = commentsWithoutDeleted.data.find(
    (c) => c.id === memberBComment.id,
  );
  TestValidator.equals(
    "Member A deleted comment should NOT be visible with includeDeleted: false",
    memberADeletedInExclude,
    undefined,
  );
  TestValidator.equals(
    "Member B deleted comment should NOT be visible with includeDeleted: false",
    memberBDeletedInExclude,
    undefined,
  );
  // 12. As member A, list comments with includeDeleted: true
  const commentsWithDeleted =
    await api.functional.redditLike.member.comments.index(memberAConnection, {
      body: {
        sort: "NEW",
        page: 1,
        limit: 100,
        search: null,
        authorId: null,
        parentId: null,
        includeDeleted: true,
      } satisfies IRedditLikeComment.IRequest,
    });
  typia.assert(commentsWithDeleted);
  // Verify member A's deleted comment IS visible but member B's is NOT
  const memberADeletedInInclude = commentsWithDeleted.data.find(
    (c) => c.id === memberAComment.id,
  );
  const memberBDeletedInInclude = commentsWithDeleted.data.find(
    (c) => c.id === memberBComment.id,
  );
  TestValidator.predicate(
    "Member A deleted comment should be visible with includeDeleted: true",
    () => memberADeletedInInclude !== undefined,
  );
  TestValidator.equals(
    "Member B deleted comment should NOT be visible even with includeDeleted: true",
    memberBDeletedInInclude,
    undefined,
  );
  // 13. Verify is_deleted flag is present and true on visible deleted comments
  if (memberADeletedInInclude) {
    TestValidator.predicate(
      "is_deleted should be true for member A's deleted comment",
      memberADeletedInInclude.is_deleted === true,
    );
    TestValidator.predicate(
      "Author info should be populated for deleted comment",
      () =>
        memberADeletedInInclude.author !== undefined &&
        memberADeletedInInclude.author.id === memberA.id,
    );
  }
}
