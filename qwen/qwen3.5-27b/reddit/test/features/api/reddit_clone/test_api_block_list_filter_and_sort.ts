import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCloneBlock } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCloneBlock";
import type { IRedditCloneBlock } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneBlock";
import type { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_clone_member_blocks_create } from "../../../generate/generate_random_reddit_clone_member_blocks_create";
import { prepare_random_reddit_clone_block } from "../../../prepare/prepare_random_reddit_clone_block";

/**
 * Test filtering and sorting capabilities of the block list endpoint.
 * 1. Authenticate as member
 * 2. Create three other member accounts to block
 * 3. Create three blocks at different times
 * 4. Test date range filtering with created_at_from and created_at_to
 * 5. Test sorting by created_at in ASC and DESC order
 * 6. Test sorting by blocked_user.username alphabetically
 * 7. Test pagination parameters (page, pageSize)
 * 8. Verify default sorting returns most recent blocks first
 * 9. Validate pagination metadata accuracy
 */
export async function test_api_block_list_filter_and_sort(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as member (blocker)
  const blockerConnection: api.IConnection = { host: connection.host };
  const blocker = await authorize_member_join(blockerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "password123",
      username: RandomGenerator.alphabets(8),
      display_name: RandomGenerator.name(2),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IRedditCloneMember.IJoin,
  });
  typia.assert(blocker);
  // 2. Create three other member accounts to block
  const blockedUser1: IRedditCloneMember.IAuthorized =
    await authorize_member_join(
      { host: connection.host },
      {
        body: {
          email: typia.random<string & tags.Format<"email">>(),
          password: "password123",
          username: "zebra_user",
          display_name: "Zebra User",
          href: typia.random<string & tags.Format<"uri">>(),
          referrer: typia.random<string & tags.Format<"uri">>(),
          ip: typia.random<string & tags.Format<"ipv4">>(),
        } satisfies IRedditCloneMember.IJoin,
      },
    );
  typia.assert(blockedUser1);
  const blockedUser2: IRedditCloneMember.IAuthorized =
    await authorize_member_join(
      { host: connection.host },
      {
        body: {
          email: typia.random<string & tags.Format<"email">>(),
          password: "password123",
          username: "alpha_user",
          display_name: "Alpha User",
          href: typia.random<string & tags.Format<"uri">>(),
          referrer: typia.random<string & tags.Format<"uri">>(),
          ip: typia.random<string & tags.Format<"ipv4">>(),
        } satisfies IRedditCloneMember.IJoin,
      },
    );
  typia.assert(blockedUser2);
  const blockedUser3: IRedditCloneMember.IAuthorized =
    await authorize_member_join(
      { host: connection.host },
      {
        body: {
          email: typia.random<string & tags.Format<"email">>(),
          password: "password123",
          username: "middle_user",
          display_name: "Middle User",
          href: typia.random<string & tags.Format<"uri">>(),
          referrer: typia.random<string & tags.Format<"uri">>(),
          ip: typia.random<string & tags.Format<"ipv4">>(),
        } satisfies IRedditCloneMember.IJoin,
      },
    );
  typia.assert(blockedUser3);
  // 3. Create first block (earliest)
  const block1 = await generate_random_reddit_clone_member_blocks_create(
    blockerConnection,
    {
      body: { blocked_user_id: blockedUser1.id },
    },
  );
  typia.assert(block1);
  const block1CreatedAt = block1.created_at;
  // Wait a bit to ensure different timestamps
  await new Promise((resolve) => setTimeout(resolve, 100));
  // 4. Create second block (middle)
  const block2 = await generate_random_reddit_clone_member_blocks_create(
    blockerConnection,
    {
      body: { blocked_user_id: blockedUser2.id },
    },
  );
  typia.assert(block2);
  const block2CreatedAt = block2.created_at;
  // Wait again
  await new Promise((resolve) => setTimeout(resolve, 100));
  // 5. Create third block (latest)
  const block3 = await generate_random_reddit_clone_member_blocks_create(
    blockerConnection,
    {
      body: { blocked_user_id: blockedUser3.id },
    },
  );
  typia.assert(block3);
  const block3CreatedAt = block3.created_at;
  // 6. Test default sorting (created_at DESC - most recent first)
  const defaultSortResult =
    await api.functional.redditClone.member.blocks.index(blockerConnection, {
      body: {} satisfies IRedditCloneBlock.IRequest,
    });
  typia.assert(defaultSortResult);
  TestValidator.equals(
    "default sort returns 3 blocks",
    defaultSortResult.data.length,
    3,
  );
  TestValidator.equals(
    "default sort - first block is most recent",
    defaultSortResult.data[0].id,
    block3.id,
  );
  TestValidator.equals(
    "default sort - second block is middle",
    defaultSortResult.data[1].id,
    block2.id,
  );
  TestValidator.equals(
    "default sort - third block is oldest",
    defaultSortResult.data[2].id,
    block1.id,
  );
  // 7. Test sorting by created_at ASC (oldest first)
  const ascSortResult = await api.functional.redditClone.member.blocks.index(
    blockerConnection,
    {
      body: {
        sortBy: "created_at",
        sortOrder: "ASC",
      } satisfies IRedditCloneBlock.IRequest,
    },
  );
  typia.assert(ascSortResult);
  TestValidator.equals(
    "ASC sort - first block is oldest",
    ascSortResult.data[0].id,
    block1.id,
  );
  TestValidator.equals(
    "ASC sort - second block is middle",
    ascSortResult.data[1].id,
    block2.id,
  );
  TestValidator.equals(
    "ASC sort - third block is most recent",
    ascSortResult.data[2].id,
    block3.id,
  );
  // 8. Test sorting by created_at DESC (most recent first)
  const descSortResult = await api.functional.redditClone.member.blocks.index(
    blockerConnection,
    {
      body: {
        sortBy: "created_at",
        sortOrder: "DESC",
      } satisfies IRedditCloneBlock.IRequest,
    },
  );
  typia.assert(descSortResult);
  TestValidator.equals(
    "DESC sort - first block is most recent",
    descSortResult.data[0].id,
    block3.id,
  );
  TestValidator.equals(
    "DESC sort - second block is middle",
    descSortResult.data[1].id,
    block2.id,
  );
  TestValidator.equals(
    "DESC sort - third block is oldest",
    descSortResult.data[2].id,
    block1.id,
  );
  // 9. Test sorting by blocked_user.username alphabetically ASC
  const usernameAscResult =
    await api.functional.redditClone.member.blocks.index(blockerConnection, {
      body: {
        sortBy: "blocked_user.username",
        sortOrder: "ASC",
      } satisfies IRedditCloneBlock.IRequest,
    });
  typia.assert(usernameAscResult);
  TestValidator.equals(
    "username ASC - first is alpha_user",
    usernameAscResult.data[0].blockedUser.username,
    "alpha_user",
  );
  TestValidator.equals(
    "username ASC - second is middle_user",
    usernameAscResult.data[1].blockedUser.username,
    "middle_user",
  );
  TestValidator.equals(
    "username ASC - third is zebra_user",
    usernameAscResult.data[2].blockedUser.username,
    "zebra_user",
  );
  // 10. Test sorting by blocked_user.username alphabetically DESC
  const usernameDescResult =
    await api.functional.redditClone.member.blocks.index(blockerConnection, {
      body: {
        sortBy: "blocked_user.username",
        sortOrder: "DESC",
      } satisfies IRedditCloneBlock.IRequest,
    });
  typia.assert(usernameDescResult);
  TestValidator.equals(
    "username DESC - first is zebra_user",
    usernameDescResult.data[0].blockedUser.username,
    "zebra_user",
  );
  TestValidator.equals(
    "username DESC - second is middle_user",
    usernameDescResult.data[1].blockedUser.username,
    "middle_user",
  );
  TestValidator.equals(
    "username DESC - third is alpha_user",
    usernameDescResult.data[2].blockedUser.username,
    "alpha_user",
  );
  // 11. Test date range filtering - filter to only middle block
  const dateRangeResult = await api.functional.redditClone.member.blocks.index(
    blockerConnection,
    {
      body: {
        created_at_from: block2CreatedAt,
        created_at_to: block2CreatedAt,
      } satisfies IRedditCloneBlock.IRequest,
    },
  );
  typia.assert(dateRangeResult);
  TestValidator.equals(
    "date range filter returns 1 block",
    dateRangeResult.data.length,
    1,
  );
  TestValidator.equals(
    "date range filter - correct block",
    dateRangeResult.data[0].id,
    block2.id,
  );
  // 12. Test date range filtering - filter to first two blocks
  const dateRangeTwoResult =
    await api.functional.redditClone.member.blocks.index(blockerConnection, {
      body: {
        created_at_from: block1CreatedAt,
        created_at_to: block2CreatedAt,
      } satisfies IRedditCloneBlock.IRequest,
    });
  typia.assert(dateRangeTwoResult);
  TestValidator.equals(
    "date range filter returns 2 blocks",
    dateRangeTwoResult.data.length,
    2,
  );
  // 13. Test pagination - page 1 with pageSize 2
  const paginationPage1 = await api.functional.redditClone.member.blocks.index(
    blockerConnection,
    {
      body: {
        page: 1,
        pageSize: 2,
      } satisfies IRedditCloneBlock.IRequest,
    },
  );
  typia.assert(paginationPage1);
  TestValidator.equals(
    "pagination page 1 - returns 2 items",
    paginationPage1.data.length,
    2,
  );
  TestValidator.equals(
    "pagination page 1 - current page is 1",
    paginationPage1.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination page 1 - limit is 2",
    paginationPage1.pagination.limit,
    2,
  );
  TestValidator.equals(
    "pagination page 1 - total records is 3",
    paginationPage1.pagination.records,
    3,
  );
  TestValidator.equals(
    "pagination page 1 - total pages is 2",
    paginationPage1.pagination.pages,
    2,
  );
  // 14. Test pagination - page 2 with pageSize 2
  const paginationPage2 = await api.functional.redditClone.member.blocks.index(
    blockerConnection,
    {
      body: {
        page: 2,
        pageSize: 2,
      } satisfies IRedditCloneBlock.IRequest,
    },
  );
  typia.assert(paginationPage2);
  TestValidator.equals(
    "pagination page 2 - returns 1 item",
    paginationPage2.data.length,
    1,
  );
  TestValidator.equals(
    "pagination page 2 - current page is 2",
    paginationPage2.pagination.current,
    2,
  );
  TestValidator.equals(
    "pagination page 2 - limit is 2",
    paginationPage2.pagination.limit,
    2,
  );
  TestValidator.equals(
    "pagination page 2 - total records is 3",
    paginationPage2.pagination.records,
    3,
  );
  TestValidator.equals(
    "pagination page 2 - total pages is 2",
    paginationPage2.pagination.pages,
    2,
  );
  // 15. Test pagination with sorting and filtering combined
  const combinedResult = await api.functional.redditClone.member.blocks.index(
    blockerConnection,
    {
      body: {
        page: 1,
        pageSize: 10,
        sortBy: "blocked_user.username",
        sortOrder: "ASC",
        created_at_from: block1CreatedAt,
      } satisfies IRedditCloneBlock.IRequest,
    },
  );
  typia.assert(combinedResult);
  TestValidator.equals(
    "combined filter and sort - returns 3 blocks",
    combinedResult.data.length,
    3,
  );
  TestValidator.equals(
    "combined filter and sort - first is alpha_user",
    combinedResult.data[0].blockedUser.username,
    "alpha_user",
  );
  TestValidator.equals(
    "combined filter and sort - pagination records is 3",
    combinedResult.pagination.records,
    3,
  );
}
