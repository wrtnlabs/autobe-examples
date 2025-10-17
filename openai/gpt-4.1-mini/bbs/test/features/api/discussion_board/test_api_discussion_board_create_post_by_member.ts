import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardDiscussionBoardCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardDiscussionBoardCategory";
import type { IDiscussionBoardDiscussionBoardPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardDiscussionBoardPost";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";

export async function test_api_discussion_board_create_post_by_member(
  connection: api.IConnection,
) {
  // 1. Member join with valid credentials
  const memberCreateBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    display_name: RandomGenerator.name(),
  } satisfies IDiscussionBoardMember.ICreate;
  const member: IDiscussionBoardMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: memberCreateBody,
    });
  typia.assert(member);

  // 2. Create a new discussion board category with a unique name
  const categoryCreateBody = {
    name: `Economic Category ${RandomGenerator.alphaNumeric(6)}`,
    description: `Category description for Economic theme - ${RandomGenerator.paragraph({ sentences: 5 })}`,
  } satisfies IDiscussionBoardDiscussionBoardCategory.ICreate;
  const category: IDiscussionBoardDiscussionBoardCategory =
    await api.functional.discussionBoard.admin.discussionBoardCategories.create(
      connection,
      { body: categoryCreateBody },
    );
  typia.assert(category);

  // 3. Create a new discussion board post authored by the member in the created category
  const postCreateBody = {
    category_id: category.id,
    title: RandomGenerator.paragraph({ sentences: 6, wordMin: 5, wordMax: 10 }),
    body: RandomGenerator.content({
      paragraphs: 3,
      sentenceMin: 10,
      sentenceMax: 20,
    }),
    post_status: "public",
  } satisfies IDiscussionBoardDiscussionBoardPost.ICreate;
  const post: IDiscussionBoardDiscussionBoardPost =
    await api.functional.discussionBoard.member.discussionBoardPosts.create(
      connection,
      { body: postCreateBody },
    );
  typia.assert(post);

  // 4. Validate created post metadata
  TestValidator.equals(
    "post category_id matches",
    post.category_id,
    category.id,
  );
  TestValidator.equals(
    "post member_id matches member.id",
    post.member_id,
    member.id,
  );
  TestValidator.predicate(
    "post title length is between 5 and 100",
    post.title.length >= 5 && post.title.length <= 100,
  );
  TestValidator.predicate(
    "post body length is at most 5000",
    post.body.length <= 5000,
  );
  TestValidator.equals("post status is public", post.post_status, "public");
  TestValidator.predicate(
    "post id is UUID format",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      post.id,
    ),
  );
  TestValidator.predicate(
    "post created_at is ISO 8601 date string",
    !Number.isNaN(Date.parse(post.created_at)),
  );
  TestValidator.predicate(
    "post updated_at is ISO 8601 date string",
    !Number.isNaN(Date.parse(post.updated_at)),
  );
}
