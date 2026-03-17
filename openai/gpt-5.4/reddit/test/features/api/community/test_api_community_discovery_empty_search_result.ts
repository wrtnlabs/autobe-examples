import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformCommunity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_community_discovery_empty_search_result(
  connection: api.IConnection,
): Promise<void> {
  const guestConnection: api.IConnection = { host: connection.host };
  const body = {
    search: `no-match-community-${RandomGenerator.alphaNumeric(24)}`,
    page: 1,
    limit: 10,
  } satisfies ICommunityPlatformCommunity.IRequest;
  const page: IPageICommunityPlatformCommunity.ISummary =
    await api.functional.communityPlatform.communities.index(guestConnection, {
      body,
    });
  typia.assert(page);
  TestValidator.equals(
    "requested page number is preserved",
    page.pagination.current,
    body.page,
  );
  TestValidator.equals(
    "requested limit is preserved",
    page.pagination.limit,
    body.limit,
  );
  TestValidator.equals(
    "empty search returns no communities",
    page.data.length,
    0,
  );
  TestValidator.predicate(
    "empty search keeps non-negative total record count",
    page.pagination.records >= 0,
  );
  TestValidator.predicate(
    "empty search keeps non-negative total page count",
    page.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "empty result page does not exceed requested limit",
    page.data.length <= page.pagination.limit,
  );
}
