import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformProfile";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_profile_browse_empty_result_page(
  connection: api.IConnection,
): Promise<void> {
  const guestConnection: api.IConnection = { host: connection.host };
  const requestedPage = 2;
  const requestedLimit = 7;
  const nonce = RandomGenerator.alphaNumeric(16);
  const request = {
    search: `no-match-search-${nonce}-${RandomGenerator.alphabets(8)}`,
    display_name: `no-match-display-${nonce}-${RandomGenerator.alphabets(8)}`,
    bio: `no-match-bio-${nonce}-${RandomGenerator.alphabets(8)}`,
    page: requestedPage,
    limit: requestedLimit,
  } satisfies ICommunityPlatformProfile.IRequest;
  const first: IPageICommunityPlatformProfile.ISummary =
    await api.functional.communityPlatform.profiles.index(guestConnection, {
      body: request,
    });
  typia.assert(first);
  const second: IPageICommunityPlatformProfile.ISummary =
    await api.functional.communityPlatform.profiles.index(guestConnection, {
      body: request,
    });
  typia.assert(second);
  TestValidator.equals("first response has empty data", first.data.length, 0);
  TestValidator.equals("second response has empty data", second.data.length, 0);
  TestValidator.equals(
    "first pagination current matches request",
    first.pagination.current,
    requestedPage,
  );
  TestValidator.equals(
    "second pagination current matches request",
    second.pagination.current,
    requestedPage,
  );
  TestValidator.equals(
    "first pagination limit matches request",
    first.pagination.limit,
    requestedLimit,
  );
  TestValidator.equals(
    "second pagination limit matches request",
    second.pagination.limit,
    requestedLimit,
  );
  TestValidator.predicate(
    "first pagination records is non-negative",
    first.pagination.records >= 0,
  );
  TestValidator.predicate(
    "second pagination records is non-negative",
    second.pagination.records >= 0,
  );
  TestValidator.predicate(
    "first pagination pages is non-negative",
    first.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "second pagination pages is non-negative",
    second.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "first empty page does not exceed requested limit",
    first.data.length <= requestedLimit,
  );
  TestValidator.predicate(
    "second empty page does not exceed requested limit",
    second.data.length <= requestedLimit,
  );
  TestValidator.equals("repeated empty browse result is stable", second, first);
}
