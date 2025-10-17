import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardDiscussionBoardCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardDiscussionBoardCategory";
import type { IDiscussionBoardDiscussionBoardPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardDiscussionBoardPost";
import type { IDiscussionBoardDiscussionBoardReplies } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardDiscussionBoardReplies";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardDiscussionBoardReplies } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardDiscussionBoardReplies";

export async function test_api_discussion_board_replies_retrieval_by_member(
  connection: api.IConnection,
) {
  // 1. Register a new member user and authenticate
  const memberEmail: string = typia.random<string & tags.Format<"email">>();
  const memberDisplayName = RandomGenerator.name();
  const member: IDiscussionBoardMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: memberEmail,
        password: "TestPassword123",
        display_name: memberDisplayName,
      } satisfies IDiscussionBoardMember.ICreate,
    });
  typia.assert(member);

  // 2. Register a new admin user and authenticate
  const adminEmail: string = typia.random<string & tags.Format<"email">>();
  const adminDisplayName = RandomGenerator.name();
  const admin: IDiscussionBoardAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: "AdminPassword123",
        displayName: adminDisplayName,
      } satisfies IDiscussionBoardAdmin.IJoin,
    });
  typia.assert(admin);

  // 3. Admin creates a discussion board category
  await api.functional.auth.admin.login(connection, {
    body: {
      email: adminEmail,
      password: "AdminPassword123",
    } satisfies IDiscussionBoardAdmin.ILogin,
  });

  const categoryName = `Category ${RandomGenerator.paragraph({ sentences: 3 })}`;
  const categoryDescription = RandomGenerator.content({ paragraphs: 1 });
  const category: IDiscussionBoardDiscussionBoardCategory =
    await api.functional.discussionBoard.admin.discussionBoardCategories.create(
      connection,
      {
        body: {
          name: categoryName,
          description: categoryDescription,
        } satisfies IDiscussionBoardDiscussionBoardCategory.ICreate,
      },
    );
  typia.assert(category);

  // 4. Member creates a discussion board post in the created category
  await api.functional.auth.member.login(connection, {
    body: {
      email: memberEmail,
      password: "TestPassword123",
    } satisfies IDiscussionBoardMember.ILogin,
  });

  const postTitle = RandomGenerator.paragraph({
    sentences: 5,
    wordMin: 5,
    wordMax: 8,
  });
  const postBody = RandomGenerator.content({
    paragraphs: 2,
    sentenceMin: 8,
    sentenceMax: 15,
    wordMin: 4,
    wordMax: 8,
  });
  const postStatus = "public";
  const post: IDiscussionBoardDiscussionBoardPost =
    await api.functional.discussionBoard.member.discussionBoardPosts.create(
      connection,
      {
        body: {
          category_id: category.id,
          title: postTitle,
          body: postBody,
          post_status: postStatus,
        } satisfies IDiscussionBoardDiscussionBoardPost.ICreate,
      },
    );
  typia.assert(post);

  // 5. Retrieve discussion board replies filtered and paginated for the post
  const page = 1;
  const limit = 5;
  const searchKey = ""; // empty to no filter
  const sortField = "created_at" as const;
  const sortOrder = "desc" as const;

  const repliesRequest: IDiscussionBoardDiscussionBoardReplies.IRequest = {
    page,
    limit,
    search: searchKey,
    sort: sortField,
    order: sortOrder,
  };

  const repliesResponse: IPageIDiscussionBoardDiscussionBoardReplies.ISummary =
    await api.functional.discussionBoard.member.discussionBoardPosts.discussionBoardReplies.index(
      connection,
      {
        discussionBoardPostId: post.id,
        body: repliesRequest,
      },
    );
  typia.assert(repliesResponse);

  // Validate pagination object
  TestValidator.predicate(
    "pagination current page matches request",
    repliesResponse.pagination.current === page,
  );
  TestValidator.predicate(
    "pagination limit matches request",
    repliesResponse.pagination.limit === limit,
  );
  TestValidator.predicate(
    "pagination pages are non-negative",
    repliesResponse.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "pagination records non-negative",
    repliesResponse.pagination.records >= 0,
  );

  // Validate all replies are associated with the requested post and have status not deleted
  for (const reply of repliesResponse.data) {
    TestValidator.equals(
      "reply post_id matches requested post id",
      reply.post_id,
      post.id,
    );
    TestValidator.predicate(
      "reply status is not deleted",
      reply.reply_status !== "deleted",
    );
    TestValidator.predicate(
      "reply content length valid",
      reply.content.length >= 5 && reply.content.length <= 1000,
    );
  }

  // 6. Verify that only members can access replies (Try unauthenticated)
  const unauthConnection: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "unauthenticated user cannot access replies",
    async () => {
      await api.functional.discussionBoard.member.discussionBoardPosts.discussionBoardReplies.index(
        unauthConnection,
        {
          discussionBoardPostId: post.id,
          body: repliesRequest,
        },
      );
    },
  );

  // 7. Verify error handling for invalid post ID (invalid UUID format)
  await TestValidator.error(
    "invalid post ID reply retrieval fails",
    async () => {
      await api.functional.discussionBoard.member.discussionBoardPosts.discussionBoardReplies.index(
        connection,
        {
          discussionBoardPostId: "invalid-uuid-format" as string &
            tags.Format<"uuid">,
          body: repliesRequest,
        },
      );
    },
  );
}
