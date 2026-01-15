import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCarrier } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCarrier";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformCarrier } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformCarrier";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
export async function test_api_carrier_search_with_name_partial_and_pagination(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Authenticate as member to access carrier search functionality
  const memberConnection: api.IConnection = { host: connection.host };
  const memberCreds = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    href: "https://example.com/join",
    referrer: "https://example.com/home",
  } satisfies ICommunityPlatformMember.IJoin;
  await authorize_member_join(memberConnection, { body: memberCreds });
  // Step 2: Get one carrier record to extract a partial name for search
  const firstPage: IPageICommunityPlatformCarrier.ISummary =
    await api.functional.communityPlatform.carriers.index(memberConnection, {
      body: {
        page: 1,
        limit: 1,
        sort_by: "name",
        order: "asc",
      } satisfies ICommunityPlatformCarrier.IRequest,
    });
  typia.assert(firstPage);
  const carrier = firstPage.data[0];
  // Step 3: Generate a partial name substring from the carrier name (3-5 chars)
  const carrierName = carrier.name;
  const partialLength = Math.floor(Math.random() * 3) + 3;
  const startIndex = Math.floor(
    Math.random() * (carrierName.length - partialLength),
  );
  const partialName = carrierName
    .substring(startIndex, startIndex + partialLength)
    .toLowerCase();
  // Step 4: Perform auth search with name_partial filter
  const searchResult: IPageICommunityPlatformCarrier.ISummary =
    await api.functional.communityPlatform.carriers.index(memberConnection, {
      body: {
        page: 2,
        limit: 10,
        name_partial: partialName,
        sort_by: "name",
        order: "asc",
      } satisfies ICommunityPlatformCarrier.IRequest,
    });
  typia.assert(searchResult);
  // Step 5: Validate pagination structure
  TestValidator.equals(
    "current page should be 2",
    searchResult.pagination.current,
    2,
  );
  TestValidator.equals("limit should be 10", searchResult.pagination.limit, 10);
  TestValidator.predicate(
    "total records should be positive",
    searchResult.pagination.records > 0,
  );
  TestValidator.predicate(
    "total pages should be positive",
    searchResult.pagination.pages > 0,
  );
  // Step 6: Validate data structure
  TestValidator.predicate(
    "data array should exist",
    Array.isArray(searchResult.data),
  );
  TestValidator.predicate(
    "data array should have items",
    searchResult.data.length > 0,
  );
  // Step 7: Validate that all returned carriers contain the partial name (case-insensitive)
  for (const carrier of searchResult.data) {
    TestValidator.predicate(
      "carrier name should contain partial name (case-insensitive)",
      carrier.name.toLowerCase().includes(partialName),
    );
  }
  // Step 8: Verify continuity between pages by checking no overlapping data
  // First page with same partial name
  const firstResults: IPageICommunityPlatformCarrier.ISummary =
    await api.functional.communityPlatform.carriers.index(memberConnection, {
      body: {
        page: 1,
        limit: 10,
        name_partial: partialName,
        sort_by: "name",
        order: "asc",
      } satisfies ICommunityPlatformCarrier.IRequest,
    });
  typia.assert(firstResults);
  // Ensure no carrier IDs from page 1 are in page 2
  const firstIds: Set<string> = new Set(firstResults.data.map((c) => c.id));
  const secondIds: Set<string> = new Set(searchResult.data.map((c) => c.id));
  for (const id of secondIds) {
    TestValidator.predicate(
      "no overlap between pagination pages",
      !firstIds.has(id),
    );
  }
}