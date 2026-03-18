import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
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

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_community_discovery_empty_search_and_pagination_boundary(
  connection: api.IConnection,
): Promise<void> {
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "Test1234!",
      username: RandomGenerator.alphabets(12),
      displayName: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
      avatarImageUri: `https://example.com/avatar/${RandomGenerator.alphabets(8)}.png`,
    } satisfies ICommunityPlatformMember.IJoin,
  });
  const firstPage =
    await api.functional.communityPlatform.member.communities.index(
      memberConnection,
      {
        body: {
          search: "",
          page: 1,
          limit: 1,
        } satisfies ICommunityPlatformCommunity.IRequest,
      },
    );
  typia.assert(firstPage);
  TestValidator.equals(
    "first page should request page 1",
    firstPage.pagination.current,
    1,
  );
  TestValidator.equals(
    "first page should use requested limit",
    firstPage.pagination.limit,
    1,
  );
  TestValidator.predicate(
    "first page pagination should be non-negative",
    firstPage.pagination.records >= 0 && firstPage.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "first page data should not exceed limit",
    firstPage.data.length <= firstPage.pagination.limit,
  );
  const boundaryPageNumber: number = Math.max(
    2,
    firstPage.pagination.pages + 1,
  );
  const boundaryPage =
    await api.functional.communityPlatform.member.communities.index(
      memberConnection,
      {
        body: {
          search: "",
          page: boundaryPageNumber,
          limit: 1,
        } satisfies ICommunityPlatformCommunity.IRequest,
      },
    );
  typia.assert(boundaryPage);
  TestValidator.equals(
    "boundary page should echo requested page number",
    boundaryPage.pagination.current,
    boundaryPageNumber,
  );
  TestValidator.equals(
    "boundary page should use requested limit",
    boundaryPage.pagination.limit,
    1,
  );
  TestValidator.predicate(
    "boundary page pagination should be non-negative",
    boundaryPage.pagination.records >= 0 && boundaryPage.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "boundary page data should not exceed limit",
    boundaryPage.data.length <= boundaryPage.pagination.limit,
  );
  TestValidator.equals(
    "pagination record counts should stay consistent across the same query scope",
    boundaryPage.pagination.records,
    firstPage.pagination.records,
  );
  TestValidator.equals(
    "pagination page count should stay consistent across the same query scope",
    boundaryPage.pagination.pages,
    firstPage.pagination.pages,
  );
  if (firstPage.pagination.pages === 0) {
    TestValidator.equals(
      "out-of-range page should be empty when no records exist",
      boundaryPage.data.length,
      0,
    );
  } else {
    TestValidator.equals(
      "out-of-range page should be empty beyond available results",
      boundaryPage.data.length,
      0,
    );
  }
}
