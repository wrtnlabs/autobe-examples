import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEOrderDirection } from "@ORGANIZATION/PROJECT-api/lib/structures/IEOrderDirection";
import type { IEconDiscussMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconDiscussMember";
import type { IEconDiscussPoll } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconDiscussPoll";
import type { IEconDiscussPollOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconDiscussPollOption";
import type { IEconDiscussPollOptionSortBy } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconDiscussPollOptionSortBy";
import type { IEconDiscussPollQuestionType } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconDiscussPollQuestionType";
import type { IEconDiscussPollVisibilityMode } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconDiscussPollVisibilityMode";
import type { IEconDiscussPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconDiscussPost";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEconDiscussPollOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEconDiscussPollOption";

export async function test_api_poll_options_listing_with_options_ordered_and_paginated(
  connection: api.IConnection,
) {
  // 1) Authenticate by joining as a member (SDK sets Authorization header)
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: `P@ssw0rd${RandomGenerator.alphaNumeric(8)}`,
    display_name: RandomGenerator.name(2),
    timezone: "Asia/Seoul",
    locale: "en-US",
  } satisfies IEconDiscussMember.ICreate;
  const auth = await api.functional.auth.member.join(connection, {
    body: joinBody,
  });
  typia.assert(auth);

  // 2) Create a post to host the poll
  const postBody = {
    title: RandomGenerator.paragraph({ sentences: 3 }),
    body: RandomGenerator.content({
      paragraphs: 2,
      sentenceMin: 6,
      sentenceMax: 10,
    }),
  } satisfies IEconDiscussPost.ICreate;
  const post = await api.functional.econDiscuss.member.posts.create(
    connection,
    { body: postBody },
  );
  typia.assert(post);

  // 3) Create a poll for the post (single_choice with minimal config)
  const pollBody = {
    question: RandomGenerator.paragraph({ sentences: 5 }),
    questionType: "single_choice" as IEconDiscussPollQuestionType,
    visibilityMode: "always_visible" as IEconDiscussPollVisibilityMode,
    expertOnly: false,
    allowVoteChange: false,
  } satisfies IEconDiscussPoll.ICreate;
  const poll = await api.functional.econDiscuss.member.posts.poll.create(
    connection,
    {
      postId: post.id,
      body: pollBody,
    },
  );
  typia.assert(poll);

  // 4) Create N (>=5) poll options with unique text and explicit positions 1..N
  const totalOptions = 5 as const;
  const createdOptions: IEconDiscussPollOption[] = [];
  for (let i = 0; i < totalOptions; i++) {
    const createOptionBody = {
      text: `Option ${i + 1} ${RandomGenerator.alphabets(6)}`,
      position: (i + 1) as number,
    } satisfies IEconDiscussPollOption.ICreate;
    const option =
      await api.functional.econDiscuss.member.posts.poll.options.create(
        connection,
        {
          postId: post.id,
          body: createOptionBody,
        },
      );
    typia.assert(option);
    createdOptions.push(option);
  }

  // 5) List options with small pageSize and validate ordering & pagination
  const pageSize = 2;

  // 5-1) First page without explicit sort params (default behavior)
  const page1 = await api.functional.econDiscuss.posts.poll.options.index(
    connection,
    {
      postId: post.id,
      body: {
        page: 1,
        pageSize,
      } satisfies IEconDiscussPollOption.IRequest,
    },
  );
  typia.assert(page1);

  // Basic pagination validations for page 1
  TestValidator.equals(
    "pagination.limit equals requested pageSize (page 1)",
    page1.pagination.limit,
    pageSize,
  );
  TestValidator.equals(
    "pagination.records equals total created options (page 1)",
    page1.pagination.records,
    createdOptions.length,
  );
  const expectedPages = Math.ceil(createdOptions.length / pageSize);
  TestValidator.equals(
    "pagination.pages computed correctly (page 1)",
    page1.pagination.pages,
    expectedPages,
  );

  // All options belong to the created poll in page 1
  TestValidator.predicate(
    "all page1 items belong to created poll",
    page1.data.every((o) => o.pollId === poll.id),
  );

  // Default ordering should be by position ascending
  const positionsPage1 = page1.data.map((o) => o.position);
  TestValidator.predicate(
    "page1 options ordered ascending by position (default)",
    positionsPage1.every((v, idx, arr) =>
      idx === 0 ? true : arr[idx - 1] <= v,
    ),
  );

  // 5-2) Subsequent pages with explicit sort parameters to ensure stable ordering across pages
  const page2 = await api.functional.econDiscuss.posts.poll.options.index(
    connection,
    {
      postId: post.id,
      body: {
        page: 2,
        pageSize,
        sort_by: "position",
        order: "asc",
      } satisfies IEconDiscussPollOption.IRequest,
    },
  );
  typia.assert(page2);
  TestValidator.equals(
    "pagination.limit equals requested pageSize (page 2)",
    page2.pagination.limit,
    pageSize,
  );
  TestValidator.equals(
    "pagination.records equals total created options (page 2)",
    page2.pagination.records,
    createdOptions.length,
  );
  TestValidator.predicate(
    "all page2 items belong to created poll",
    page2.data.every((o) => o.pollId === poll.id),
  );

  const page3 = await api.functional.econDiscuss.posts.poll.options.index(
    connection,
    {
      postId: post.id,
      body: {
        page: 3,
        pageSize,
        sort_by: "position",
        order: "asc",
      } satisfies IEconDiscussPollOption.IRequest,
    },
  );
  typia.assert(page3);
  TestValidator.equals(
    "pagination.records equals total created options (page 3)",
    page3.pagination.records,
    createdOptions.length,
  );
  TestValidator.predicate(
    "all page3 items belong to created poll",
    page3.data.every((o) => o.pollId === poll.id),
  );

  // Verify stable ordering across pages: concatenated positions must equal [1..N]
  const concatenated = [...page1.data, ...page2.data, ...page3.data];
  const concatenatedPositions = concatenated.map((o) => o.position);
  const expectedPositions = Array.from(
    { length: totalOptions },
    (_, i) => i + 1,
  );
  TestValidator.equals(
    "concatenated positions across pages equals [1..N] in ascending order",
    concatenatedPositions,
    expectedPositions,
  );
}
