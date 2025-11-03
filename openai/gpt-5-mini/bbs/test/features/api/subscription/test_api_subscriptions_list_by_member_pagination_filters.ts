import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAttachment";
import type { IDiscussionBoardCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardCategory";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardSubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSubscription";
import type { IDiscussionBoardTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardTag";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardSubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardSubscription";

export async function test_api_subscriptions_list_by_member_pagination_filters(
  connection: api.IConnection,
) {
  /**
   * Purpose: Validate pagination and filtering of member subscription listings.
   *
   * Steps:
   *
   * 1. Create a test member via POST /auth/member/join (authenticated context).
   * 2. Create multiple articles to be used as subscription targets.
   * 3. Create multiple subscriptions for the member (mix delivery modes and active
   *    flags).
   * 4. Call PATCH /discussionBoard/member/members/{memberUsername}/subscriptions
   *    with pagination and filters and validate:
   *
   *    - Pagination metadata (current, limit, records, pages)
   *    - That returned records respect deliveryMode and active filters
   *    - Page sizes respect limit and page
   *    - Stable ordering across pages (no duplicate ids across pages)
   *    - Edge case: requesting page beyond last returns empty data and valid
   *         metadata
   */

  // 1) Member registration (auth). The join call sets connection.headers.Authorization automatically.
  const username = `u_${RandomGenerator.alphaNumeric(8)}`;
  const email = typia.random<string & tags.Format<"email">>();
  const password = "Aa1!" + RandomGenerator.alphaNumeric(9); // >= 12 chars

  const joinBody = {
    username,
    email,
    password,
    href: "https://example.com/test",
    referrer: "https://referrer.example.com",
  } satisfies IDiscussionBoardMember.IJoin;

  const memberAuth: IDiscussionBoardMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: joinBody,
    });
  typia.assert(memberAuth);

  // Member summary and username to use when creating subscriptions
  const memberUsername: string = memberAuth.username;

  // 2) Create multiple articles as subscription targets
  const articles: IDiscussionBoardArticle[] = await ArrayUtil.asyncRepeat(
    6,
    async (i) => {
      const articleBody = {
        title: RandomGenerator.paragraph({
          sentences: 6,
          wordMin: 3,
          wordMax: 8,
        }).slice(0, 250),
        content: RandomGenerator.content({
          paragraphs: 2,
          sentenceMin: 8,
          sentenceMax: 12,
        }),
      } satisfies IDiscussionBoardArticle.ICreate;

      const article: IDiscussionBoardArticle =
        await api.functional.discussionBoard.member.articles.create(
          connection,
          {
            body: articleBody,
          },
        );
      typia.assert(article);
      return article;
    },
  );

  // 3) Create multiple subscriptions for the member with mixed delivery modes and active flags
  const deliveryModes = ["immediate", "daily_digest"] as const;

  const subscriptions: IDiscussionBoardSubscription[] = [];
  for (let i = 0; i < articles.length; ++i) {
    const art = articles[i];
    const body = {
      target_type: "article",
      target_id: art.id,
      delivery_mode: RandomGenerator.pick([
        "immediate",
        "daily_digest",
      ] as const),
      active: i % 3 !== 0, // some active true, some false
    } satisfies IDiscussionBoardSubscription.ICreate;

    const created: IDiscussionBoardSubscription =
      await api.functional.discussionBoard.member.members.subscriptions.create(
        connection,
        {
          memberUsername,
          body,
        },
      );
    typia.assert(created);
    subscriptions.push(created);
  }

  // Ensure we have at least one immediate & active subscription to test filtering
  const hasImmediateActive = subscriptions.some(
    (s) => s.deliveryMode === "immediate" && s.active === true,
  );
  TestValidator.predicate(
    "created at least one immediate & active subscription",
    hasImmediateActive,
  );

  // 4) Request paginated, filtered listing: page=1, limit=3, deliveryMode=immediate, active=true
  const pageSize = 3;
  const filterReq = {
    page: 1,
    limit: pageSize,
    deliveryMode: "immediate",
    active: true,
  } satisfies IDiscussionBoardSubscription.IRequest;

  const page1: IPageIDiscussionBoardSubscription.ISummary =
    await api.functional.discussionBoard.member.members.subscriptions.index(
      connection,
      {
        memberUsername,
        body: filterReq,
      },
    );
  typia.assert(page1);

  // Validate pagination metadata
  TestValidator.equals(
    "page limit respected (page1)",
    page1.pagination.limit,
    pageSize,
  );
  TestValidator.equals(
    "page current is 1 (page1)",
    page1.pagination.current,
    1,
  );
  TestValidator.predicate(
    "page records is non-negative",
    page1.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pages computed is consistent",
    page1.pagination.pages ===
      Math.ceil(page1.pagination.records / page1.pagination.limit) ||
      page1.pagination.records === 0,
  );

  // Validate filters narrow results correctly
  TestValidator.predicate(
    "all returned subscriptions match deliveryMode and active",
    page1.data.every(
      (d) => d.deliveryMode === "immediate" && d.active === true,
    ),
  );

  // Validate page size
  TestValidator.predicate(
    "data length less than or equal to limit (page1)",
    page1.data.length <= pageSize,
  );

  // Fetch page 2 with same filters to validate stable ordering and no overlap
  const page2Req = {
    ...filterReq,
    page: 2,
  } satisfies IDiscussionBoardSubscription.IRequest;
  const page2: IPageIDiscussionBoardSubscription.ISummary =
    await api.functional.discussionBoard.member.members.subscriptions.index(
      connection,
      {
        memberUsername,
        body: page2Req,
      },
    );
  typia.assert(page2);

  // No duplicate ids between pages
  const idsPage1 = page1.data.map((d) => d.id);
  const idsPage2 = page2.data.map((d) => d.id);
  const intersection = idsPage1.filter((id) => idsPage2.includes(id));
  TestValidator.equals(
    "no duplicate ids between page1 and page2",
    intersection,
    [],
  );

  // Validate that concatenation length is <= total records
  TestValidator.predicate(
    "concatenated pages length <= total records",
    idsPage1.length + idsPage2.length <= page1.pagination.records,
  );

  // Edge case: request page beyond last
  const beyondPageNumber = page1.pagination.pages + 1;
  const beyond: IPageIDiscussionBoardSubscription.ISummary =
    await api.functional.discussionBoard.member.members.subscriptions.index(
      connection,
      {
        memberUsername,
        body: {
          page: beyondPageNumber,
          limit: page1.pagination.limit,
        } satisfies IDiscussionBoardSubscription.IRequest,
      },
    );
  typia.assert(beyond);

  TestValidator.equals("beyond page returns empty data", beyond.data.length, 0);
  TestValidator.equals(
    "beyond pagination current matches request",
    beyond.pagination.current,
    beyondPageNumber,
  );
  TestValidator.equals(
    "beyond pagination limit preserved",
    beyond.pagination.limit,
    page1.pagination.limit,
  );
}
