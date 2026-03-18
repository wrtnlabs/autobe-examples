import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmTimeTrackingMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingMember";
import type { IHrmTimeTrackingOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingOrganization";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHrmTimeTrackingOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmTimeTrackingOrganization";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_organization_browse_search_pagination(
  connection: api.IConnection,
): Promise<void> {
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IHrmTimeTrackingMember.IJoin,
  });
  typia.assert(member);
  const baseRequest = {
    page: 1,
    limit: 10,
  } satisfies IHrmTimeTrackingOrganization.IRequest;
  const firstPage =
    await api.functional.hrmTimeTracking.member.organizations.index(
      memberConnection,
      { body: baseRequest },
    );
  typia.assert(firstPage);
  const repeatedPage =
    await api.functional.hrmTimeTracking.member.organizations.index(
      memberConnection,
      { body: baseRequest },
    );
  typia.assert(repeatedPage);
  TestValidator.equals(
    "repeated browse response should be stable",
    repeatedPage,
    firstPage,
  );
  TestValidator.equals(
    "pagination current should match request",
    firstPage.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination limit should match request",
    firstPage.pagination.limit,
    10,
  );
  TestValidator.predicate(
    "pagination records should be non-negative",
    firstPage.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages should be non-negative",
    firstPage.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "page size should not exceed limit",
    firstPage.data.length <= baseRequest.limit,
  );
  const noMatchRequest = {
    search: `zzzz-${RandomGenerator.alphaNumeric(12)}`,
    page: 1,
    limit: 5,
  } satisfies IHrmTimeTrackingOrganization.IRequest;
  const emptyPage =
    await api.functional.hrmTimeTracking.member.organizations.index(
      memberConnection,
      { body: noMatchRequest },
    );
  typia.assert(emptyPage);
  TestValidator.equals(
    "no-match page should be empty",
    emptyPage.data.length,
    0,
  );
  TestValidator.equals(
    "no-match pagination current",
    emptyPage.pagination.current,
    1,
  );
  TestValidator.equals(
    "no-match pagination limit",
    emptyPage.pagination.limit,
    5,
  );
  TestValidator.equals(
    "no-match pagination records",
    emptyPage.pagination.records,
    0,
  );
  TestValidator.equals(
    "no-match pagination pages",
    emptyPage.pagination.pages,
    0,
  );
  if (firstPage.data.length > 0) {
    const sample = firstPage.data[0];
    const tokenSource = sample.description ?? sample.name;
    const searchToken = RandomGenerator.substring(tokenSource).trim();
    const searchRequest = {
      search: searchToken.length > 0 ? searchToken : sample.name,
      page: 1,
      limit: 10,
    } satisfies IHrmTimeTrackingOrganization.IRequest;
    const searchPage =
      await api.functional.hrmTimeTracking.member.organizations.index(
        memberConnection,
        { body: searchRequest },
      );
    typia.assert(searchPage);
    TestValidator.predicate(
      "search results should not exceed requested limit",
      searchPage.data.length <= searchRequest.limit,
    );
    TestValidator.predicate(
      "search results should match organization name or description",
      () =>
        searchPage.data.every((organization) => {
          const name = organization.name.toLowerCase();
          const description = organization.description?.toLowerCase() ?? "";
          const needle = searchRequest.search!.toLowerCase();
          return name.includes(needle) || description.includes(needle);
        }),
    );
    const searchPageAgain =
      await api.functional.hrmTimeTracking.member.organizations.index(
        memberConnection,
        { body: searchRequest },
      );
    typia.assert(searchPageAgain);
    TestValidator.equals(
      "search results should be stable",
      searchPageAgain,
      searchPage,
    );
  }
}
