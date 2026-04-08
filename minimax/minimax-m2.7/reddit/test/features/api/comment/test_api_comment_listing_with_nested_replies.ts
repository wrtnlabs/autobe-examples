import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCloneComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCloneComment";
import type { IRedditCloneComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneComment";
import type { IRedditCloneCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunity";
import type { IRedditCloneCommunityIcon } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunityIcon";
import type { IRedditCloneFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFile";
import type { IRedditCloneFileAssociation } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFileAssociation";
import type { IRedditCloneFileScan } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFileScan";
import type { IRedditCloneFileThumbnail } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFileThumbnail";
import type { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
import type { IRedditClonePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePost";
import type { IRedditClonePostImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePostImage";
import type { IRedditClonePostLink } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePostLink";
import type { IRedditClonePostTextContent } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePostTextContent";
import type { IRedditCloneSubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneSubscription";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_clone_member_communities_create } from "../../../generate/generate_random_reddit_clone_member_communities_create";
import { generate_random_reddit_clone_member_posts_create } from "../../../generate/generate_random_reddit_clone_member_posts_create";
import { generate_random_reddit_clone_member_reddit_clone_comments_replies_create } from "../../../generate/generate_random_reddit_clone_member_reddit_clone_comments_replies_create";
import { generate_random_reddit_clone_member_reddit_clone_posts_comments_create } from "../../../generate/generate_random_reddit_clone_member_reddit_clone_posts_comments_create";
import { generate_random_reddit_clone_member_subscriptions_create } from "../../../generate/generate_random_reddit_clone_member_subscriptions_create";
import { prepare_random_reddit_clone_comment } from "../../../prepare/prepare_random_reddit_clone_comment";
import { prepare_random_reddit_clone_community } from "../../../prepare/prepare_random_reddit_clone_community";
import { prepare_random_reddit_clone_post } from "../../../prepare/prepare_random_reddit_clone_post";
import { prepare_random_reddit_clone_subscription } from "../../../prepare/prepare_random_reddit_clone_subscription";

export async function test_api_comment_listing_with_nested_replies(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {});
  // 2. Create community
  const community =
    await generate_random_reddit_clone_member_communities_create(
      memberConnection,
      {},
    );
  // 3. Subscribe to community
  await generate_random_reddit_clone_member_subscriptions_create(
    memberConnection,
    {
      body: { communityId: community.id },
    },
  );
  // 4. Create post
  const post = await generate_random_reddit_clone_member_posts_create(
    memberConnection,
    {
      body: {
        communityId: community.id,
        title: RandomGenerator.paragraph({ sentences: 1 }),
        type: "text",
        body: RandomGenerator.content({ paragraphs: 1 }),
      },
    },
  );
  // 5. Create top-level comment
  const topLevelComment =
    await generate_random_reddit_clone_member_reddit_clone_posts_comments_create(
      memberConnection,
      {
        params: { postId: post.id },
        body: { content: RandomGenerator.paragraph({ sentences: 2 }) },
      },
    );
  // 6. Create nested replies at multiple depths (Level 1, 2, 3+)
  const level1Reply =
    await generate_random_reddit_clone_member_reddit_clone_comments_replies_create(
      memberConnection,
      {
        params: { commentId: topLevelComment.id },
        body: { content: RandomGenerator.paragraph({ sentences: 1 }) },
      },
    );
  const level2Reply =
    await generate_random_reddit_clone_member_reddit_clone_comments_replies_create(
      memberConnection,
      {
        params: { commentId: level1Reply.id },
        body: { content: RandomGenerator.paragraph({ sentences: 1 }) },
      },
    );
  const level3Reply =
    await generate_random_reddit_clone_member_reddit_clone_comments_replies_create(
      memberConnection,
      {
        params: { commentId: level2Reply.id },
        body: { content: RandomGenerator.paragraph({ sentences: 1 }) },
      },
    );
  // Create another branch to test multiple nested structures
  const level1Reply2 =
    await generate_random_reddit_clone_member_reddit_clone_comments_replies_create(
      memberConnection,
      {
        params: { commentId: topLevelComment.id },
        body: { content: RandomGenerator.paragraph({ sentences: 1 }) },
      },
    );
  // 7. Call PATCH /redditClone/redditClone/posts/{postId}/comments with sort='Best'
  const commentsResponse =
    await api.functional.redditClone.redditClone.posts.comments.index(
      connection,
      {
        postId: post.id,
        body: {
          sort: "Best",
          page: 1,
          limit: 20,
        },
      },
    );
  typia.assert(commentsResponse);
  // 8. Validations
  // - Response must have data array
  TestValidator.predicate(
    "comments response has data",
    commentsResponse.data !== undefined,
  );
  TestValidator.predicate(
    "comments response has at least one top-level comment",
    commentsResponse.data.length >= 1,
  );
  // Find the top-level comment we created
  const foundTopLevelComment = commentsResponse.data.find(
    (c) => c.id === topLevelComment.id,
  );
  TestValidator.predicate(
    "top-level comment exists in response",
    foundTopLevelComment !== undefined,
  );
  if (foundTopLevelComment) {
    // - Top-level comments have 'replies' array property
    TestValidator.predicate(
      "top-level comment has replies array",
      foundTopLevelComment.replies !== undefined,
    );
    TestValidator.predicate(
      "top-level comment replies is array",
      Array.isArray(foundTopLevelComment.replies),
    );
    // - Nested replies are included as objects within parent comment's replies array
    TestValidator.predicate(
      "top-level comment has replies",
      foundTopLevelComment.replies.length >= 1,
    );
    // Find level 1 reply in the replies array
    const foundLevel1Reply = foundTopLevelComment.replies.find(
      (r) => r.id === level1Reply.id,
    );
    TestValidator.predicate(
      "level 1 reply exists under top-level comment",
      foundLevel1Reply !== undefined,
    );
    if (foundLevel1Reply) {
      // - Each nested reply also has its own replies array for deeper nesting
      TestValidator.predicate(
        "level 1 reply has replies array",
        foundLevel1Reply.replies !== undefined,
      );
      TestValidator.predicate(
        "level 1 reply has nested replies",
        foundLevel1Reply.replies.length >= 1,
      );
      // Find level 2 reply
      const foundLevel2Reply = foundLevel1Reply.replies.find(
        (r) => r.id === level2Reply.id,
      );
      TestValidator.predicate(
        "level 2 reply exists under level 1 reply",
        foundLevel2Reply !== undefined,
      );
      if (foundLevel2Reply) {
        // Continue validating depth
        TestValidator.predicate(
          "level 2 reply has replies array",
          foundLevel2Reply.replies !== undefined,
        );
        // Find level 3 reply
        const foundLevel3Reply = foundLevel2Reply.replies.find(
          (r) => r.id === level3Reply.id,
        );
        TestValidator.predicate(
          "level 3 reply exists under level 2 reply",
          foundLevel3Reply !== undefined,
        );
        // Verify level 3 reply has its own replies array (unlimited depth)
        if (foundLevel3Reply) {
          TestValidator.predicate(
            "level 3 reply has replies array",
            foundLevel3Reply.replies !== undefined,
          );
          TestValidator.predicate(
            "level 3 reply replies is array",
            Array.isArray(foundLevel3Reply.replies),
          );
        }
      }
    }
    // Verify second branch of replies
    const foundLevel1Reply2 = foundTopLevelComment.replies.find(
      (r) => r.id === level1Reply2.id,
    );
    TestValidator.predicate(
      "second level 1 reply exists under top-level comment",
      foundLevel1Reply2 !== undefined,
    );
  }
}
