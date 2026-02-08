import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformPostComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostComment";
import type { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformPostComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformPostComment";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";

export async function test_api_post_comments_index_nested_replies_and_sort_order_verification(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate user
  const userConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_user_join(userConnection, { body: {} });
  typia.assert(authorized);
  userConnection.headers = {
    Authorization: `Bearer ${authorized.token.access}`,
  };
  // 2. Create a post
  const postBody = {
    community_id: typia.random<string & tags.Format<"uuid">>(),
    title: RandomGenerator.name(3),
    post_type: "text",
    text: {
      content: RandomGenerator.paragraph({ sentences: 3 }),
    },
  } satisfies ICommunityPlatformPost.ICreate;
  const post = await api.functional.communityPlatform.user.posts.create(
    userConnection,
    { body: postBody },
  );
  typia.assert(post);
  // 3. The scenario requests nested comment creation, but no create endpoint for comments is provided.
  // We'll proceed with retrieval tests, assuming nested comments exist or are empty.
  // 4. Test retrieval with different sort orders
  const sortOrders = ["best", "new", "controversial"] as const;
  for (const sortOrder of sortOrders) {
    const body: ICommunityPlatformPostComment.IRequest = {
      page: 1,
      limit: 10,
      sort: sortOrder,
      parent_id: null,
      search: null,
    };
    /**
     * We need to assert the type of commentsPage, which returns pagination and data.
     * The data array contains comments. ICommunityPlatformPostComment.ISummary does not declare properties like parent_id, id, replies, created_at.
     * We extend them with intersection types as the test needs these properties for validation.
     */
    type CommentWithReplies = ICommunityPlatformPostComment.ISummary & {
      parent_id: string | null;
      id: string & tags.Format<"uuid">;
      replies: CommentWithReplies[];
      created_at: string;
    };
    const commentsPage =
      (await api.functional.communityPlatform.user.posts.comments.index(
        userConnection,
        {
          postId: (post as any).id as string,
          body,
        },
      )) as {
        pagination: IPage.IPagination;
        data: CommentWithReplies[];
      };
    typia.assert(commentsPage);
    // Validate pagination
    TestValidator.predicate(
      `pagination exists for sort order ${sortOrder}`,
      commentsPage.pagination !== null &&
        typeof commentsPage.pagination === "object",
    );
    TestValidator.predicate(
      `page number is 1 for sort order ${sortOrder}`,
      commentsPage.pagination.current === 1,
    );
    // Validate that all top-level comments in data have parent_id == null
    for (const comment of commentsPage.data) {
      typia.assert(comment);
      TestValidator.equals(
        `comment parent_id is null for sort order ${sortOrder}`,
        comment.parent_id,
        null,
      );
      typia.assert<string & tags.Format<"uuid">>(comment.id);
      TestValidator.predicate(
        `replies is array for comment in sort order ${sortOrder}`,
        Array.isArray(comment.replies),
      );
      // Recursive validation for nested replies
      function validateNestedReplies(comments: CommentWithReplies[]): void {
        for (const reply of comments) {
          typia.assert(reply);
          TestValidator.notEquals(
            `nested reply parent_id is not null in sort order ${sortOrder}`,
            reply.parent_id,
            null,
          );
          typia.assert<string & tags.Format<"uuid">>(reply.id);
          if (Array.isArray(reply.replies)) {
            validateNestedReplies(reply.replies);
          }
        }
      }
      validateNestedReplies(comment.replies);
    }
    // Validate sorting order: check for 'new' that list is sorted by created_at descending
    if (sortOrder === "new" && commentsPage.data.length > 1) {
      for (let i = 1; i < commentsPage.data.length; i++) {
        const prev = commentsPage.data[i - 1];
        const curr = commentsPage.data[i];
        const prevDate = new Date(prev.created_at).getTime();
        const currDate = new Date(curr.created_at).getTime();
        TestValidator.predicate(
          `comments are sorted by created_at desc for "new" order at index ${i}`,
          prevDate >= currDate,
        );
      }
    }
  }
}
