import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformBannedWord } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformBannedWord";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformBannedWord } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformBannedWord";

/**
 * E2E test for admin banned words paginated search, filtering, sort, and access
 * control.
 *
 * This test validates that authenticated admins can retrieve a paginated list
 * of banned words, filter by keyword and status, sort the results, and receive
 * correct metadata, while unauthenticated access is denied. Key steps: admin
 * creation (auth), banned word creation, various PATCH/filter/search cases
 * (pagination, search string, active/inactive, sort fields, keyword-miss),
 * asserts on data structure and correctness, negative test for unauthenticated
 * access.
 */
export async function test_api_admin_banned_words_search_and_pagination(
  connection: api.IConnection,
) {
  // 1. Register/admin authenticate
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const admin = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: "TestPassword123!",
      superuser: true,
    } satisfies ICommunityPlatformAdmin.ICreate,
  });
  typia.assert(admin);

  // 2. Create multiple banned words with different combinations of word, reason, and active status
  const testWords = [
    { word: "forbidden-apple", reason: "fruit policy", active: true },
    { word: "forbidden-banana", reason: "fruit policy", active: false },
    { word: "dangerous-pear", reason: "safety concern", active: true },
    { word: "spoiler-fish", reason: undefined, active: true },
    { word: "scam-oranges", reason: "scam", active: true },
  ];
  const createdWords: ICommunityPlatformBannedWord[] = [];
  for (const entry of testWords) {
    const bw = await api.functional.communityPlatform.admin.bannedWords.create(
      connection,
      {
        body: {
          word: entry.word,
          reason: entry.reason,
          active: entry.active,
        } satisfies ICommunityPlatformBannedWord.ICreate,
      },
    );
    typia.assert(bw);
    createdWords.push(bw);
    TestValidator.equals(
      `Created word has correct word field`,
      bw.word,
      entry.word,
    );
    TestValidator.equals(
      `Created word has correct active flag`,
      bw.active,
      entry.active,
    );
    if (entry.reason !== undefined) {
      TestValidator.equals(
        `Created word has correct reason`,
        bw.reason,
        entry.reason,
      );
    }
  }

  // 3a. Pagination: page 1 should have limit 2
  let resp = await api.functional.communityPlatform.admin.bannedWords.index(
    connection,
    {
      body: {
        page: 1,
        limit: 2,
      } satisfies ICommunityPlatformBannedWord.IRequest,
    },
  );
  typia.assert(resp);
  TestValidator.equals("pagination.limit is 2", resp.pagination.limit, 2);
  TestValidator.equals("pagination.page has 2 results", resp.data.length, 2);

  // 3b. Pagination: page 2 also works
  resp = await api.functional.communityPlatform.admin.bannedWords.index(
    connection,
    {
      body: {
        page: 2,
        limit: 2,
      } satisfies ICommunityPlatformBannedWord.IRequest,
    },
  );
  typia.assert(resp);
  TestValidator.equals("pagination.current is 2", resp.pagination.current, 2);
  TestValidator.equals(
    "pagination.limit is 2 for page 2",
    resp.pagination.limit,
    2,
  );

  // 3c. Search by keyword substring
  resp = await api.functional.communityPlatform.admin.bannedWords.index(
    connection,
    {
      body: { search: "apple" } satisfies ICommunityPlatformBannedWord.IRequest,
    },
  );
  typia.assert(resp);
  TestValidator.predicate(
    "Search for apple gives at least 1 result",
    resp.data.some((w) => w.word.includes("apple")),
  );

  // 3d. Filter active: true
  resp = await api.functional.communityPlatform.admin.bannedWords.index(
    connection,
    { body: { active: true } satisfies ICommunityPlatformBannedWord.IRequest },
  );
  typia.assert(resp);
  TestValidator.predicate(
    "All returned are active",
    resp.data.every((w) => w.active),
  );

  // 3e. Filter active: false
  resp = await api.functional.communityPlatform.admin.bannedWords.index(
    connection,
    { body: { active: false } satisfies ICommunityPlatformBannedWord.IRequest },
  );
  typia.assert(resp);
  TestValidator.predicate(
    "All returned are inactive",
    resp.data.every((w) => w.active === false),
  );
  TestValidator.predicate(
    "Contains forbidden-banana",
    resp.data.some((w) => w.word === "forbidden-banana"),
  );

  // 3f. Sort by word asc/desc
  for (const order of ["asc", "desc"] as const) {
    resp = await api.functional.communityPlatform.admin.bannedWords.index(
      connection,
      {
        body: {
          sort: "word",
          order,
        } satisfies ICommunityPlatformBannedWord.IRequest,
      },
    );
    typia.assert(resp);
    const sorted = [...resp.data].sort((a, b) =>
      order === "asc"
        ? a.word.localeCompare(b.word)
        : b.word.localeCompare(a.word),
    );
    for (let i = 0; i < resp.data.length; ++i) {
      TestValidator.equals(
        `word field sorted ${order}`,
        resp.data[i].word,
        sorted[i].word,
      );
    }
  }

  // 3g. Sort by created_at asc/desc
  for (const order of ["asc", "desc"] as const) {
    resp = await api.functional.communityPlatform.admin.bannedWords.index(
      connection,
      {
        body: {
          sort: "created_at",
          order,
        } satisfies ICommunityPlatformBannedWord.IRequest,
      },
    );
    typia.assert(resp);
    const sorted = [...resp.data].sort((a, b) =>
      order === "asc"
        ? a.created_at.localeCompare(b.created_at)
        : b.created_at.localeCompare(a.created_at),
    );
    for (let i = 0; i < resp.data.length; ++i) {
      TestValidator.equals(
        `created_at field sorted ${order}`,
        resp.data[i].created_at,
        sorted[i].created_at,
      );
    }
  }

  // 3h. Sort by updated_at asc/desc
  for (const order of ["asc", "desc"] as const) {
    resp = await api.functional.communityPlatform.admin.bannedWords.index(
      connection,
      {
        body: {
          sort: "updated_at",
          order,
        } satisfies ICommunityPlatformBannedWord.IRequest,
      },
    );
    typia.assert(resp);
    const sorted = [...resp.data].sort((a, b) =>
      order === "asc"
        ? a.updated_at.localeCompare(b.updated_at)
        : b.updated_at.localeCompare(a.updated_at),
    );
    for (let i = 0; i < resp.data.length; ++i) {
      TestValidator.equals(
        `updated_at field sorted ${order}`,
        resp.data[i].updated_at,
        sorted[i].updated_at,
      );
    }
  }

  // 4. Metadata correctness
  for (const word of createdWords) {
    const found = resp.data.find((w) => w.word === word.word);
    if (found) {
      TestValidator.equals(`word present`, found.word, word.word);
      TestValidator.equals(`active present`, found.active, word.active);
      if (word.reason !== undefined) {
        TestValidator.equals(`reason present`, found.reason, word.reason);
      }
    }
  }

  // 5. Keyword that does not exist
  resp = await api.functional.communityPlatform.admin.bannedWords.index(
    connection,
    {
      body: {
        search: "unlikely_NOMATCH",
      } satisfies ICommunityPlatformBannedWord.IRequest,
    },
  );
  typia.assert(resp);
  TestValidator.equals("no results for unmatched keyword", resp.data.length, 0);

  // 6. Unauthenticated access should fail
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "Unauthenticated should fail to list bannedWords",
    async () => {
      await api.functional.communityPlatform.admin.bannedWords.index(
        unauthConn,
        { body: {} satisfies ICommunityPlatformBannedWord.IRequest },
      );
    },
  );
}
