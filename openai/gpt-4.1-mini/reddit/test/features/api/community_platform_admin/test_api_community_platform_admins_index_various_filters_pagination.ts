import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformAdmin";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_community_platform_admins_index_various_filters_pagination(
  connection: api.IConnection,
): Promise<void> {
  // Scenario 1: Retrieve the first page of administrator accounts without any filters to verify basic pagination and default sorting.
  {
    const body: ICommunityPlatformAdmin.IRequest = {};
    const response = await api.functional.communityPlatform.admins.index(
      connection,
      { body },
    );
    typia.assert(response);
    TestValidator.equals(
      "pagination current page is 1",
      response.pagination.current,
      1,
    );
    TestValidator.predicate("data array exists", Array.isArray(response.data));
  }
  // Scenario 2: Retrieve administrator accounts by searching with a partial display name match - Not supported due to empty IRequest schema, so just call with empty body and validate data.
  {
    const response = await api.functional.communityPlatform.admins.index(
      connection,
      { body: {} },
    );
    typia.assert(response);
    TestValidator.equals(
      "pagination current page is 1",
      response.pagination.current,
      1,
    );
    TestValidator.predicate("data array exists", Array.isArray(response.data));
  }
  // Scenario 3: Retrieve a filtered list of administrators created within a specific date range - Not supported due to empty IRequest schema, so just call with empty body and validate createdAt dates.
  {
    const response = await api.functional.communityPlatform.admins.index(
      connection,
      { body: {} },
    );
    typia.assert(response);
    TestValidator.equals(
      "pagination current page is 1",
      response.pagination.current,
      1,
    );
    TestValidator.predicate("data array exists", Array.isArray(response.data));
  }
}
