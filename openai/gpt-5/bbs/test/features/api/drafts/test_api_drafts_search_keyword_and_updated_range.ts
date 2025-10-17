import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEEconDiscussDraftSortBy } from "@ORGANIZATION/PROJECT-api/lib/structures/IEEconDiscussDraftSortBy";
import type { IEEconDiscussSortOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEEconDiscussSortOrder";
import type { IEconDiscussMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconDiscussMember";
import type { IEconDiscussPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconDiscussPost";
import type { IEconDiscussPostDraft } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconDiscussPostDraft";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEconDiscussPostDraft } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEconDiscussPostDraft";

/**
 * Search private drafts by keyword and updated range with published link
 * filter.
 *
 * End-to-end workflow
 *
 * 1. Join as a fresh member (auth token handled by SDK)
 * 2. Create multiple drafts with non-null title/body
 * 3. Update two drafts to inject a distinct keyword and bump updated_at
 * 4. Publish those two keyword drafts so post_id is non-null
 * 5. Build an updated_at window around "now"
 * 6. Search with q=KEYWORD, publishedLink=true, updatedFrom/updatedTo
 * 7. Validate results filtered correctly and ordered by updated_at desc
 */
export async function test_api_drafts_search_keyword_and_updated_range(
  connection: api.IConnection,
) {
  // 1) Join as member
  const member = await api.functional.auth.member.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(12),
      display_name: RandomGenerator.name(2),
      timezone: "Asia/Seoul",
      locale: "en-US",
    } satisfies IEconDiscussMember.ICreate,
  });
  typia.assert(member);

  // Distinct keyword for filtering
  const KEYWORD = `kw_${RandomGenerator.alphaNumeric(8)}`;

  // 2) Create multiple drafts
  const createdDrafts: IEconDiscussPostDraft[] = [];
  for (let i = 0; i < 4; i++) {
    const created = await api.functional.econDiscuss.member.drafts.create(
      connection,
      {
        body: {
          title: RandomGenerator.paragraph({ sentences: 3 }),
          body: RandomGenerator.content({ paragraphs: 2 }),
        } satisfies IEconDiscussPostDraft.ICreate,
      },
    );
    typia.assert(created);
    createdDrafts.push(created);
  }

  // Helper to update a draft with new title/body containing KEYWORD
  const updateWithKeyword = async (
    draft: IEconDiscussPostDraft,
    inTitle: boolean,
  ): Promise<IEconDiscussPostDraft> => {
    const updated = await api.functional.econDiscuss.member.drafts.update(
      connection,
      {
        draftId: draft.id,
        body: inTitle
          ? ({
              title: `${draft.title ?? ""} ${KEYWORD}`.trim(),
            } satisfies IEconDiscussPostDraft.IUpdate)
          : ({
              body: `${draft.body ?? ""}\n${KEYWORD}`,
            } satisfies IEconDiscussPostDraft.IUpdate),
      },
    );
    typia.assert(updated);
    return updated;
  };

  // 3) Update two drafts to include KEYWORD and bump updated_at
  const targetA = await updateWithKeyword(createdDrafts[0], true);
  const targetB = await updateWithKeyword(createdDrafts[1], false);

  // 4) Publish those two keyword drafts
  const postA = await api.functional.econDiscuss.member.drafts.publish(
    connection,
    { draftId: targetA.id },
  );
  typia.assert(postA);

  const postB = await api.functional.econDiscuss.member.drafts.publish(
    connection,
    { draftId: targetB.id },
  );
  typia.assert(postB);

  // Optional: bump one again to ensure later updated_at
  const bumpedB = await api.functional.econDiscuss.member.drafts.update(
    connection,
    {
      draftId: targetB.id,
      body: {
        title:
          `${targetB.title ?? ""} ${RandomGenerator.paragraph({ sentences: 1 })}`.trim(),
      } satisfies IEconDiscussPostDraft.IUpdate,
    },
  );
  typia.assert(bumpedB);

  // 5) Build updated_at window to include recent updates
  const updatedFrom = new Date(Date.now() - 5 * 60 * 1000).toISOString();
  const updatedTo = new Date(Date.now() + 5 * 60 * 1000).toISOString();

  // 6) Search with keyword + window + publishedLink filter
  const pageSize = 10 as const;
  const page = await api.functional.econDiscuss.member.drafts.index(
    connection,
    {
      body: {
        page: 1 as number, // 1-based request
        pageSize: pageSize as number,
        q: KEYWORD,
        updatedFrom,
        updatedTo,
        publishedLink: true,
        sortBy: "updated_at",
        order: "desc",
      } satisfies IEconDiscussPostDraft.IRequest,
    },
  );
  typia.assert(page);

  // 7) Validations
  // - All results must have post_id and include KEYWORD
  for (const d of page.data) {
    TestValidator.predicate(
      "publishedLink=true ensures post_id is not null",
      d.post_id !== null && d.post_id !== undefined,
    );
    const inTitle = (d.title ?? "").includes(KEYWORD);
    const inBody = (d.body ?? "").includes(KEYWORD);
    TestValidator.predicate(
      "draft must contain keyword in title or body",
      inTitle || inBody,
    );
    // updated_at within [updatedFrom, updatedTo]
    const ua = new Date(d.updated_at).getTime();
    TestValidator.predicate(
      "updated_at within requested window",
      ua >= new Date(updatedFrom).getTime() &&
        ua <= new Date(updatedTo).getTime(),
    );
  }

  // - Ordering by updated_at desc
  for (let i = 1; i < page.data.length; i++) {
    const prev = new Date(page.data[i - 1]!.updated_at).getTime();
    const curr = new Date(page.data[i]!.updated_at).getTime();
    TestValidator.predicate("results sorted by updated_at desc", prev >= curr);
  }

  // - Expected dataset: exactly the two published keyword drafts
  const returnedIds = page.data.map((d) => d.id);
  TestValidator.predicate(
    "exactly two drafts returned",
    page.data.length === 2,
  );
  TestValidator.predicate(
    "contains published draft A",
    returnedIds.includes(targetA.id),
  );
  TestValidator.predicate(
    "contains published draft B",
    returnedIds.includes(targetB.id),
  );

  // - Pagination sanity
  TestValidator.predicate(
    "pagination.current is non-negative",
    page.pagination.current >= 0,
  );
  TestValidator.equals(
    "pagination.limit equals requested pageSize",
    page.pagination.limit,
    pageSize,
  );
  TestValidator.predicate(
    "pagination.records >= data length",
    page.pagination.records >= page.data.length,
  );
}
