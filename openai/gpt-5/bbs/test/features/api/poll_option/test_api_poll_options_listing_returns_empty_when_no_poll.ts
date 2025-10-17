import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEOrderDirection } from "@ORGANIZATION/PROJECT-api/lib/structures/IEOrderDirection";
import type { IEconDiscussMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconDiscussMember";
import type { IEconDiscussPollOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconDiscussPollOption";
import type { IEconDiscussPollOptionSortBy } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconDiscussPollOptionSortBy";
import type { IEconDiscussPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconDiscussPost";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEconDiscussPollOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEconDiscussPollOption";

/**
 * Ensure listing poll options returns an empty page when a post has no poll.
 *
 * Business context:
 *
 * - Poll options belong to a poll that is 1:1 with a post. When a post has no
 *   poll configured, the options listing must return an empty page rather than
 *   an error. The listing endpoint is typically public; authentication is used
 *   only to create the post for scoping.
 *
 * Steps:
 *
 * 1. Register a member (issue tokens automatically via SDK) to gain authoring
 *    context.
 * 2. Create a new post as the authenticated member (no poll attached).
 * 3. List poll options for the created post with default pagination (empty body).
 * 4. Validate: empty data array and zero records/pages in pagination metadata.
 */
export async function test_api_poll_options_listing_returns_empty_when_no_poll(
  connection: api.IConnection,
) {
  // 1) Register member for setup (auth token handled by SDK)
  const authorized = await api.functional.auth.member.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(12),
      display_name: RandomGenerator.name(1),
      timezone: "Asia/Seoul",
      locale: "en-US",
    } satisfies IEconDiscussMember.ICreate,
  });
  typia.assert(authorized);

  // 2) Create a post (no poll configured)
  const post = await api.functional.econDiscuss.member.posts.create(
    connection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 6 }),
        body: RandomGenerator.content({
          paragraphs: 2,
          sentenceMin: 8,
          sentenceMax: 16,
        }),
        summary: RandomGenerator.paragraph({ sentences: 8 }),
      } satisfies IEconDiscussPost.ICreate,
    },
  );
  typia.assert(post);

  // 3) List poll options of the post with default pagination (empty body)
  const page = await api.functional.econDiscuss.posts.poll.options.index(
    connection,
    {
      postId: post.id,
      body: {} satisfies IEconDiscussPollOption.IRequest,
    },
  );
  typia.assert(page);

  // 4) Business validations
  TestValidator.equals(
    "poll options data list should be empty when no poll is configured",
    page.data.length,
    0,
  );
  TestValidator.equals(
    "poll options total records should be zero when no poll is configured",
    page.pagination.records,
    0,
  );
  TestValidator.equals(
    "poll options total pages should be zero when no poll is configured",
    page.pagination.pages,
    0,
  );
}
