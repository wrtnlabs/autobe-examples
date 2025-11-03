import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";
import type { IDiscussionBoardTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardTag";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardTag";

export async function test_api_tag_search_pagination_public(
  connection: api.IConnection,
) {
  /**
   * End-to-end scenario: Public tag search and pagination after
   * moderator-created tags.
   *
   * Steps implemented:
   *
   * 1. Create a moderator account via POST /auth/moderator/join.
   * 2. As the moderator, create three tags with distinct names/slugs and varying
   *    is_active flags (two active, one inactive).
   * 3. Use an unauthenticated connection to call PATCH /discussionBoard/tags for:
   *
   *    - Pagination (page=1, limit=2)
   *    - Partial-text search
   *    - Is_active filter (explicitly requesting inactive)
   *    - Sorting by created_at desc and by name asc
   *    - IncludeArchived flag check
   *    - Edge cases: page beyond total pages and search with no matches
   *
   * Validations:
   *
   * - All API calls are awaited and responses validated with typia.assert
   * - Business assertions are made via TestValidator with descriptive titles
   */

  // 1) Moderator join
  const moderatorEmail: string = typia.random<string & tags.Format<"email">>();
  const moderatorBody = {
    username: `mod_${RandomGenerator.alphaNumeric(6)}`,
    email: moderatorEmail,
    password: "Aa1!Aa1!Aa1!", // 12 chars, contains upper, lower, digit, symbol
    href: "https://example.com/initial",
    referrer: "https://referrer.example.com/",
  } satisfies IDiscussionBoardModerator.ICreate;

  const moderator: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: moderatorBody,
    });
  typia.assert(moderator);

  // 2) Create multiple tags as moderator (at least 3)
  const tagsToCreate: IDiscussionBoardTag.ICreate[] = [
    {
      name: `economy ${RandomGenerator.paragraph({ sentences: 2 }).replace(/\s+/g, " ")}`.slice(
        0,
        80,
      ),
      slug: `economy-${RandomGenerator.alphaNumeric(6)}`,
      description: null,
      is_active: true,
    },
    {
      name: `policy ${RandomGenerator.paragraph({ sentences: 2 }).replace(/\s+/g, " ")}`.slice(
        0,
        80,
      ),
      slug: `policy-${RandomGenerator.alphaNumeric(6)}`,
      description: null,
      is_active: true,
    },
    {
      name: `legacy ${RandomGenerator.paragraph({ sentences: 2 }).replace(/\s+/g, " ")}`.slice(
        0,
        80,
      ),
      slug: `legacy-${RandomGenerator.alphaNumeric(6)}`,
      description: null,
      is_active: false,
    },
  ];

  const createdTags: IDiscussionBoardTag[] = [];
  for (const body of tagsToCreate) {
    const created = await api.functional.discussionBoard.moderator.tags.create(
      connection,
      {
        body: body satisfies IDiscussionBoardTag.ICreate,
      },
    );
    typia.assert(created);
    createdTags.push(created);
  }

  // Prepare unauthenticated public connection clone
  const publicConn: api.IConnection = { ...connection, headers: {} };

  // Helper: active tags we created
  const activeCreated = createdTags.filter((t) => t.is_active === true);
  const inactiveCreated = createdTags.filter((t) => t.is_active === false);

  // 3a) Public: Retrieve first page (page=1, limit=2) and assert pagination
  const page1: IPageIDiscussionBoardTag.ISummary =
    await api.functional.discussionBoard.tags.index(publicConn, {
      body: { page: 1, limit: 2 } satisfies IDiscussionBoardTag.IRequest,
    });
  typia.assert(page1);

  TestValidator.equals(
    "pagination current equals requested page",
    page1.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination limit equals requested limit",
    page1.pagination.limit,
    2,
  );
  TestValidator.predicate(
    "returned items do not exceed requested limit",
    page1.data.length <= 2,
  );

  // The public listing should by default expose only active tags; ensure reported records equals activeCreated.length
  TestValidator.equals(
    "pagination records equals number of active tags",
    page1.pagination.records,
    activeCreated.length,
  );

  // All returned items should be active (public listing default)
  TestValidator.predicate(
    "all returned items are active in public listing",
    page1.data.every((d) => d.is_active === true),
  );

  // 3b) Partial-text search on name/slug (use substring from one active tag)
  const sampleActive = activeCreated[0];
  const searchTerm = sampleActive.slug.substring(0, 4); // pick a short partial term

  const searchResult: IPageIDiscussionBoardTag.ISummary =
    await api.functional.discussionBoard.tags.index(publicConn, {
      body: {
        search: searchTerm,
        limit: 10,
      } satisfies IDiscussionBoardTag.IRequest,
    });
  typia.assert(searchResult);

  TestValidator.predicate(
    `search returns at least one item containing "${searchTerm}"`,
    searchResult.data.some(
      (d) => d.slug.includes(searchTerm) || d.name.includes(searchTerm),
    ),
  );

  // 3c) Filter by is_active=false (explicit request for inactive tags)
  const inactiveResult: IPageIDiscussionBoardTag.ISummary =
    await api.functional.discussionBoard.tags.index(publicConn, {
      body: {
        is_active: false,
        limit: 10,
      } satisfies IDiscussionBoardTag.IRequest,
    });
  typia.assert(inactiveResult);

  // Some servers may ignore is_active for anonymous callers; accept either no results or only inactive results
  TestValidator.predicate(
    "is_active=false filter either returns no public rows or only inactive rows",
    inactiveResult.data.length === 0 ||
      inactiveResult.data.every((d) => d.is_active === false),
  );

  // 4) Sorting: created_at desc and name asc produce expected orderings among active tags
  // Sort our created active tags for expected order
  const expectedByCreatedDesc = activeCreated
    .slice()
    .sort((a, b) => b.created_at.localeCompare(a.created_at));
  const createdDesc: IPageIDiscussionBoardTag.ISummary =
    await api.functional.discussionBoard.tags.index(publicConn, {
      body: {
        sort: "-createdAt",
        limit: 10,
      } satisfies IDiscussionBoardTag.IRequest,
    });
  typia.assert(createdDesc);

  TestValidator.equals(
    "sorted by created_at desc: ids match expected",
    createdDesc.data.map((d) => d.id),
    expectedByCreatedDesc.map((d) => d.id),
  );

  // Sort by name asc
  const expectedByNameAsc = activeCreated
    .slice()
    .sort((a, b) => a.name.localeCompare(b.name));
  const nameAsc: IPageIDiscussionBoardTag.ISummary =
    await api.functional.discussionBoard.tags.index(publicConn, {
      body: { sort: "name", limit: 10 } satisfies IDiscussionBoardTag.IRequest,
    });
  typia.assert(nameAsc);

  TestValidator.equals(
    "sorted by name asc: ids match expected",
    nameAsc.data.map((d) => d.id),
    expectedByNameAsc.map((d) => d.id),
  );

  // 5) includeArchived flag check (if supported) - call with includeArchived=true and ensure response is valid
  const includeArchived: IPageIDiscussionBoardTag.ISummary =
    await api.functional.discussionBoard.tags.index(publicConn, {
      body: {
        includeArchived: true,
        limit: 10,
      } satisfies IDiscussionBoardTag.IRequest,
    });
  typia.assert(includeArchived);
  TestValidator.predicate(
    "includeArchived returns a valid page object",
    includeArchived.data !== undefined &&
      includeArchived.pagination !== undefined,
  );

  // Edge case: pagination boundary - request a page beyond total pages and expect empty data
  const beyondPage = (page1.pagination.pages ?? 1) + 5;
  const emptyPage: IPageIDiscussionBoardTag.ISummary =
    await api.functional.discussionBoard.tags.index(publicConn, {
      body: {
        page: beyondPage,
        limit: 2,
      } satisfies IDiscussionBoardTag.IRequest,
    });
  typia.assert(emptyPage);
  TestValidator.equals(
    "beyond total pages returns empty data array",
    emptyPage.data.length,
    0,
  );
  TestValidator.equals(
    "beyond total pages current equals requested page",
    emptyPage.pagination.current,
    beyondPage,
  );

  // Edge case: search with no matches
  const impossibleTerm = `no_such_tag_${RandomGenerator.alphaNumeric(8)}`;
  const noMatch: IPageIDiscussionBoardTag.ISummary =
    await api.functional.discussionBoard.tags.index(publicConn, {
      body: {
        search: impossibleTerm,
        limit: 5,
      } satisfies IDiscussionBoardTag.IRequest,
    });
  typia.assert(noMatch);
  TestValidator.equals(
    "search with no matches returns empty data",
    noMatch.data.length,
    0,
  );
}
