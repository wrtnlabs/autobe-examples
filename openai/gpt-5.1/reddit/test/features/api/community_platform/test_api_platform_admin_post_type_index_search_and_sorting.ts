import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAccountStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAccountStatus";
import type { ICommunityPlatformPlatformadmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPlatformadmin";
import type { ICommunityPlatformPostType } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostType";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformPostType } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformPostType";

export async function test_api_platform_admin_post_type_index_search_and_sorting(
  connection: api.IConnection,
) {
  // 1. Register and authenticate a platform admin
  const joinBody = {
    username: RandomGenerator.alphabets(12),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    displayName: RandomGenerator.name(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies ICommunityPlatformPlatformadmin.IJoin;

  const admin = await api.functional.auth.platformAdmin.join(connection, {
    body: joinBody,
  });
  typia.assert<ICommunityPlatformPlatformadmin.IAuthorized>(admin);

  // 2. Seed three distinct post types
  const textGeneralCreate = {
    code: "text_general",
    name: "Text General",
    description: RandomGenerator.paragraph({ sentences: 5 }),
  } satisfies ICommunityPlatformPostType.ICreate;

  const textAnnouncementCreate = {
    code: "text_announcement",
    name: "Text Announcement",
    description: RandomGenerator.paragraph({ sentences: 5 }),
  } satisfies ICommunityPlatformPostType.ICreate;

  const pollCreate = {
    code: "poll",
    name: "Poll",
    description: RandomGenerator.paragraph({ sentences: 5 }),
  } satisfies ICommunityPlatformPostType.ICreate;

  const textGeneral =
    await api.functional.communityPlatform.platformAdmin.postTypes.create(
      connection,
      { body: textGeneralCreate },
    );
  typia.assert<ICommunityPlatformPostType>(textGeneral);

  const textAnnouncement =
    await api.functional.communityPlatform.platformAdmin.postTypes.create(
      connection,
      { body: textAnnouncementCreate },
    );
  typia.assert<ICommunityPlatformPostType>(textAnnouncement);

  const poll =
    await api.functional.communityPlatform.platformAdmin.postTypes.create(
      connection,
      { body: pollCreate },
    );
  typia.assert<ICommunityPlatformPostType>(poll);

  // 3. Search for "Text" with sorting by name desc
  const pageSize = 10;
  const searchTextRequest = {
    page: 1,
    pageSize,
    search: "Text",
    sortBy: "name",
    sortOrder: "desc" as const,
  } satisfies ICommunityPlatformPostType.IRequest;

  const searchTextResult =
    await api.functional.communityPlatform.platformAdmin.postTypes.index(
      connection,
      { body: searchTextRequest },
    );
  typia.assert<IPageICommunityPlatformPostType.ISummary>(searchTextResult);

  const searchTextData = searchTextResult.data;
  const searchTextPagination = searchTextResult.pagination;

  // 4. Validate that only text-related post types are returned and sorted by name desc
  TestValidator.equals(
    "two post types match 'Text' search",
    searchTextData.length,
    2,
  );

  const returnedCodes = searchTextData.map((d) => d.code);
  TestValidator.predicate(
    "poll post type is not included in 'Text' search",
    !returnedCodes.includes(poll.code),
  );

  const expectedCodes = [textGeneral.code, textAnnouncement.code];
  TestValidator.predicate(
    "only seeded text post types are returned",
    searchTextData.every((d) => expectedCodes.includes(d.code)),
  );

  const actualNames = searchTextData.map((d) => d.name);
  const expectedNamesDesc = [...actualNames].sort(
    (a, b) => a.localeCompare(b) * -1,
  );
  TestValidator.equals(
    "post types sorted by name in descending order",
    actualNames,
    expectedNamesDesc,
  );

  // 5. Validate pagination metadata for 'Text' search
  TestValidator.equals(
    "current page is 1 for 'Text' search",
    searchTextPagination.current,
    1,
  );

  TestValidator.equals(
    "page size equals requested pageSize for 'Text' search",
    searchTextPagination.limit,
    pageSize,
  );

  TestValidator.equals(
    "record count matches number of returned rows for 'Text' search",
    searchTextPagination.records,
    searchTextData.length,
  );

  TestValidator.equals(
    "single page of results for 'Text' search",
    searchTextPagination.pages,
    1,
  );

  // 6. Second search: search for "Poll" with sorting by name asc
  const searchPollRequest = {
    page: 1,
    pageSize,
    search: "Poll",
    sortBy: "name",
    sortOrder: "asc" as const,
  } satisfies ICommunityPlatformPostType.IRequest;

  const searchPollResult =
    await api.functional.communityPlatform.platformAdmin.postTypes.index(
      connection,
      { body: searchPollRequest },
    );
  typia.assert<IPageICommunityPlatformPostType.ISummary>(searchPollResult);

  const searchPollData = searchPollResult.data;
  const searchPollPagination = searchPollResult.pagination;

  TestValidator.equals(
    "exactly one post type matches 'Poll' search",
    searchPollData.length,
    1,
  );

  const pollSummary = searchPollData[0];
  TestValidator.equals(
    "search 'Poll' returns the seeded poll code",
    pollSummary.code,
    poll.code,
  );
  TestValidator.equals(
    "search 'Poll' returns the seeded poll name",
    pollSummary.name,
    poll.name,
  );

  TestValidator.equals(
    "poll search pagination current page is 1",
    searchPollPagination.current,
    1,
  );
  TestValidator.equals(
    "poll search pagination limit equals requested pageSize",
    searchPollPagination.limit,
    pageSize,
  );
  TestValidator.equals(
    "poll search pagination records is 1",
    searchPollPagination.records,
    searchPollData.length,
  );
  TestValidator.equals(
    "poll search pagination pages is 1",
    searchPollPagination.pages,
    1,
  );
}
