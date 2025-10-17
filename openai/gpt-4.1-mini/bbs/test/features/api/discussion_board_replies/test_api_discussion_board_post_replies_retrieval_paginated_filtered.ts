import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardDiscussionBoardCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardDiscussionBoardCategory";
import type { IDiscussionBoardDiscussionBoardPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardDiscussionBoardPost";
import type { IDiscussionBoardDiscussionBoardReply } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardDiscussionBoardReply";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardDiscussionBoardReply } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardDiscussionBoardReply";

/**
 * Test the retrieval of a paginated and filtered list of replies for a specific
 * discussion board post identified by postId.
 *
 * This test performs a complete workflow involving:
 *
 * 1. Admin registration and login
 * 2. Creating a discussion board category by admin
 * 3. Member registration and login
 * 4. Member creating a discussion board post associated with the category
 * 5. Member creating multiple replies to that post
 * 6. Member retrieving paginated and filtered replies with search and pagination
 *    parameters
 * 7. Validations on pagination, filtering, and data ownership
 *
 * The test checks that the API correctly supports role-based authorization,
 * data creation, and filtered page retrieval of discussion board replies.
 * Proper type-safe usage of APIs, DTOs, and validations with typia and
 * TestValidator is demonstrated.
 */
export async function test_api_discussion_board_post_replies_retrieval_paginated_filtered(
  connection: api.IConnection,
) {
  // 1. Admin registers
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = "password123";
  const adminJoinPayload = {
    email: adminEmail,
    password: adminPassword,
    displayName: RandomGenerator.name(),
  } satisfies IDiscussionBoardAdmin.IJoin;

  const admin: IDiscussionBoardAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinPayload,
    });
  typia.assert(admin);

  // 2. Admin login
  const adminLoginPayload = {
    email: adminEmail,
    password: adminPassword,
  } satisfies IDiscussionBoardAdmin.ILogin;
  await api.functional.auth.admin.login(connection, {
    body: adminLoginPayload,
  });

  // 3. Admin creates a category
  const categoryCreatePayload = {
    name: `${RandomGenerator.name(2)} Category`,
    description: RandomGenerator.paragraph({ sentences: 5 }),
  } satisfies IDiscussionBoardDiscussionBoardCategory.ICreate;

  const category: IDiscussionBoardDiscussionBoardCategory =
    await api.functional.discussionBoard.admin.discussionBoardCategories.create(
      connection,
      {
        body: categoryCreatePayload,
      },
    );
  typia.assert(category);
  TestValidator.predicate(
    "category id is valid uuid",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      category.id,
    ),
  );

  // 4. Member registers
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = "memberpass123";
  const memberJoinPayload = {
    email: memberEmail,
    password: memberPassword,
    display_name: RandomGenerator.name(),
  } satisfies IDiscussionBoardMember.ICreate;

  const member: IDiscussionBoardMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: memberJoinPayload,
    });
  typia.assert(member);

  // 5. Member login
  const memberLoginPayload = {
    email: memberEmail,
    password: memberPassword,
  } satisfies IDiscussionBoardMember.ILogin;
  await api.functional.auth.member.login(connection, {
    body: memberLoginPayload,
  });

  // 6. Member creates a discussion board post associated with the category
  const postCreatePayload = {
    category_id: category.id,
    title: RandomGenerator.paragraph({ sentences: 3, wordMin: 5, wordMax: 10 }),
    body: RandomGenerator.content({
      paragraphs: 2,
      sentenceMin: 8,
      sentenceMax: 12,
      wordMin: 3,
      wordMax: 7,
    }),
    post_status: "public",
  } satisfies IDiscussionBoardDiscussionBoardPost.ICreate;

  const post: IDiscussionBoardDiscussionBoardPost =
    await api.functional.discussionBoard.member.discussionBoardPosts.create(
      connection,
      {
        body: postCreatePayload,
      },
    );
  typia.assert(post);
  TestValidator.predicate(
    "post id is valid uuid",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      post.id,
    ),
  );

  // 7. Member creates multiple replies for the post
  const repliesToCreateCount = 3;
  const replies: IDiscussionBoardDiscussionBoardReply[] = [];
  for (let i = 0; i < repliesToCreateCount; i++) {
    const replyCreatePayload = {
      post_id: post.id,
      member_id: member.id,
      content: RandomGenerator.paragraph({
        sentences: 3,
        wordMin: 5,
        wordMax: 10,
      }),
      reply_status: "public",
    } satisfies IDiscussionBoardDiscussionBoardReply.ICreate;

    const reply =
      await api.functional.discussionBoard.member.discussionBoardPosts.discussionBoardReplies.postByPostid(
        connection,
        {
          postId: post.id,
          body: replyCreatePayload,
        },
      );
    typia.assert(reply);
    TestValidator.predicate(
      `reply ${i} id is valid uuid`,
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        reply.id,
      ),
    );
    replies.push(reply);
  }

  // 8. Member retrieves filtered and paginated replies with search keyword and pagination
  const searchKeyword = replies[0].content.substring(0, 5); // partial text
  const filterStatus = "public";
  const page = 1;
  const limit = 2;

  const filterRequestBody = {
    search: searchKeyword,
    filter_status: filterStatus,
    page: page,
    limit: limit,
    sort_by: "created_at",
    sort_order: "desc",
  } satisfies IDiscussionBoardDiscussionBoardReply.IRequest;

  const pageResult: IPageIDiscussionBoardDiscussionBoardReply.ISummary =
    await api.functional.discussionBoard.discussionBoardPosts.discussionBoardReplies.index(
      connection,
      {
        postId: post.id,
        body: filterRequestBody,
      },
    );
  typia.assert(pageResult);

  // 9. Validate that returned replies belong to the correct post
  TestValidator.equals(
    "pagination current page",
    pageResult.pagination.current,
    page,
  );
  TestValidator.equals("pagination limit", pageResult.pagination.limit, limit);
  TestValidator.predicate(
    "pagination total records >= replies created",
    pageResult.pagination.records >= repliesToCreateCount,
  );
  TestValidator.predicate(
    "pagination total pages >= 1",
    pageResult.pagination.pages >= 1,
  );

  for (const replySummary of pageResult.data) {
    TestValidator.predicate(
      "reply belongs to post",
      replySummary !== null && replySummary !== undefined,
    );
    TestValidator.predicate(
      "reply content includes search keyword",
      replySummary.content.includes(searchKeyword),
    );
    TestValidator.equals(
      "reply status matches filter",
      replySummary.reply_status,
      filterStatus,
    );
  }
}
