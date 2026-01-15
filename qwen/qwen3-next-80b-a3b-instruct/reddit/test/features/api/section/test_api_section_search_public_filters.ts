import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformGuest";
import type { ICommunityPlatformSection } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformSection";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformSection";
import { authorize_guest_join } from "../../../authorize/authorize_guest_join";
import { authorize_guest_refresh } from "../../../authorize/authorize_guest_refresh";
export async function test_api_section_search_public_filters(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Authenticate as guest user to test public section search functionality
  const guestConnection: api.IConnection = { host: connection.host };
  const guestAuth: ICommunityPlatformGuest.IAuthorized =
    await authorize_guest_join(guestConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
      } satisfies ICommunityPlatformGuest.IJoin,
    });
  typia.assert(guestAuth);
  // Step 2: Test search with minimal parameters — ensures endpoint is responsive and returns correct structure
  const minSearch: ICommunityPlatformSection.IRequest = {
    page: 1,
    limit: 10,
  } satisfies ICommunityPlatformSection.IRequest;
  const minResult: IPageICommunityPlatformSection.ISummary =
    await api.functional.communityPlatform.sections.index(guestConnection, {
      body: minSearch,
    });
  typia.assert(minResult);
  // Validate pagination types
  TestValidator.equals("page is 1", minResult.pagination.current, 1);
  TestValidator.equals("limit is 10", minResult.pagination.limit, 10);
  TestValidator.predicate("records >= 0", minResult.pagination.records >= 0);
  TestValidator.predicate("pages >= 0", minResult.pagination.pages >= 0);
  // Step 3: Test search with name filter
  const nameSearch: ICommunityPlatformSection.IRequest = {
    page: 1,
    limit: 10,
    name: "",
  } satisfies ICommunityPlatformSection.IRequest;
  const nameResult: IPageICommunityPlatformSection.ISummary =
    await api.functional.communityPlatform.sections.index(guestConnection, {
      body: nameSearch,
    });
  typia.assert(nameResult);
  // Step 4: Test search with description filter
  const descriptionSearch: ICommunityPlatformSection.IRequest = {
    page: 1,
    limit: 10,
    description: "",
  } satisfies ICommunityPlatformSection.IRequest;
  const descriptionResult: IPageICommunityPlatformSection.ISummary =
    await api.functional.communityPlatform.sections.index(guestConnection, {
      body: descriptionSearch,
    });
  typia.assert(descriptionResult);
  // Step 5: Test search with status filter — active
  const statusSearch: ICommunityPlatformSection.IRequest = {
    page: 1,
    limit: 10,
    status: "active",
  } satisfies ICommunityPlatformSection.IRequest;
  const statusResult: IPageICommunityPlatformSection.ISummary =
    await api.functional.communityPlatform.sections.index(guestConnection, {
      body: statusSearch,
    });
  typia.assert(statusResult);
  // Step 6: Test search with category filter
  const categorySearch: ICommunityPlatformSection.IRequest = {
    page: 1,
    limit: 10,
    category: "",
  } satisfies ICommunityPlatformSection.IRequest;
  const categoryResult: IPageICommunityPlatformSection.ISummary =
    await api.functional.communityPlatform.sections.index(guestConnection, {
      body: categorySearch,
    });
  typia.assert(categoryResult);
  // Step 7: Test sorting by name ascending
  const sortByAscName: ICommunityPlatformSection.IRequest = {
    page: 1,
    limit: 10,
    sortBy: "name",
    order: "asc",
  } satisfies ICommunityPlatformSection.IRequest;
  const resultByAscName: IPageICommunityPlatformSection.ISummary =
    await api.functional.communityPlatform.sections.index(guestConnection, {
      body: sortByAscName,
    });
  typia.assert(resultByAscName);
  // Step 8: Test sorting by name descending
  const sortByDescName: ICommunityPlatformSection.IRequest = {
    page: 1,
    limit: 10,
    sortBy: "name",
    order: "desc",
  } satisfies ICommunityPlatformSection.IRequest;
  const resultByDescName: IPageICommunityPlatformSection.ISummary =
    await api.functional.communityPlatform.sections.index(guestConnection, {
      body: sortByDescName,
    });
  typia.assert(resultByDescName);
}
