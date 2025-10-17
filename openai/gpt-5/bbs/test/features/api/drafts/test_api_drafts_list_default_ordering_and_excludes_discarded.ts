import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconDiscussMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconDiscussMember";
import type { IEconDiscussPostDraft } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconDiscussPostDraft";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEconDiscussPostDraft } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEconDiscussPostDraft";

/**
 * Validate drafts listing excludes discarded drafts and orders by updated_at
 * desc.
 *
 * Steps:
 *
 * 1. Join as a new member
 * 2. Create three drafts
 * 3. Discard the second draft
 * 4. List drafts
 * 5. Assert: discarded draft excluded; remaining drafts included; ordering by
 *    updated_at desc; basic pagination sanity
 * 6. Authentication boundary: unauthenticated listing should error
 */
export async function test_api_drafts_list_default_ordering_and_excludes_discarded(
  connection: api.IConnection,
) {
  // 1) Join as a new member (fresh account → deterministic listing)
  const email: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const password: string & tags.MinLength<8> = typia.random<
    string & tags.MinLength<8>
  >();
  const authorized: IEconDiscussMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email,
        password,
        display_name: RandomGenerator.name(1),
        timezone: "Asia/Seoul",
        locale: "en-US",
      } satisfies IEconDiscussMember.ICreate,
    });
  typia.assert(authorized);

  // 2) Create three drafts
  const draft1: IEconDiscussPostDraft =
    await api.functional.econDiscuss.member.drafts.create(connection, {
      body: {
        title: RandomGenerator.paragraph({ sentences: 4 }),
        body: RandomGenerator.content({ paragraphs: 1 }),
      } satisfies IEconDiscussPostDraft.ICreate,
    });
  typia.assert(draft1);

  const draft2: IEconDiscussPostDraft =
    await api.functional.econDiscuss.member.drafts.create(connection, {
      body: {
        title: RandomGenerator.paragraph({ sentences: 3 }),
        body: RandomGenerator.content({ paragraphs: 1 }),
      } satisfies IEconDiscussPostDraft.ICreate,
    });
  typia.assert(draft2);

  const draft3: IEconDiscussPostDraft =
    await api.functional.econDiscuss.member.drafts.create(connection, {
      body: {
        title: RandomGenerator.paragraph({ sentences: 5 }),
        body: RandomGenerator.content({ paragraphs: 1 }),
      } satisfies IEconDiscussPostDraft.ICreate,
    });
  typia.assert(draft3);

  // 3) Discard the second draft
  await api.functional.econDiscuss.member.drafts.erase(connection, {
    draftId: draft2.id,
  });

  // 4) List drafts
  const page: IPageIEconDiscussPostDraft =
    await api.functional.econDiscuss.member.drafts.search(connection);
  typia.assert(page);

  // 5) Assertions
  const ids = page.data.map((d) => d.id);

  // discarded excluded
  TestValidator.predicate(
    "discarded draft is excluded from listing",
    ids.includes(draft2.id) === false,
  );
  // remaining actives included
  TestValidator.predicate(
    "active draft1 is included",
    ids.includes(draft1.id) === true,
  );
  TestValidator.predicate(
    "active draft3 is included",
    ids.includes(draft3.id) === true,
  );

  // ordering: updated_at desc (monotonic non-increasing)
  for (let i = 1; i < page.data.length; i++) {
    const prev = new Date(page.data[i - 1].updated_at).getTime();
    const curr = new Date(page.data[i].updated_at).getTime();
    TestValidator.predicate(
      `ordering: updated_at[${i - 1}] >= updated_at[${i}]`,
      prev >= curr,
    );
  }

  // pagination sanity (avoid asserting exact defaults)
  TestValidator.predicate(
    "pagination.records >= returned length",
    page.pagination.records >= page.data.length,
  );
  TestValidator.predicate("pagination.limit >= 1", page.pagination.limit >= 1);
  TestValidator.predicate("pagination.pages >= 1", page.pagination.pages >= 1);

  // 6) Authentication boundary: unauthenticated listing must error
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "unauthenticated drafts listing should fail",
    async () => {
      await api.functional.econDiscuss.member.drafts.search(unauthConn);
    },
  );
}
