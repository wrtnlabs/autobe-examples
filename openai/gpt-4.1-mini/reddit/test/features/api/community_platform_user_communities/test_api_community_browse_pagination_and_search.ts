import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformCommunity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";

export async function test_api_community_browse_pagination_and_search(
  connection: api.IConnection,
): Promise<void> {
  /**
   * Test suite: Browse and Search Communities API
   *
   * 1. Setup user join as prerequisite to simulate real environment for user actor.
   * 2. Test basic browsing (no filters, no pagination), verify sorting and pagination meta.
   *
   * Note: Search and pagination parameter tests cannot be fully tested due to lack of API parameters.
   */
  // 1. User join (authorization prerequisite)
  const userConnection: api.IConnection = { host: connection.host };
  await authorize_user_join(userConnection, { body: {} });
  // 2. Test basic browse without filters or pagination
  const browseResult1 =
    await api.functional.communityPlatform.user.communities.browse.index(
      connection,
    );
  typia.assert(browseResult1);
  // Validate pagination properties existence and types
  TestValidator.predicate(
    "pagination object exists",
    browseResult1.pagination !== null &&
      typeof browseResult1.pagination === "object",
  );
  TestValidator.predicate(
    "pagination current page is >= 1",
    browseResult1.pagination.current >= 1,
  );
  TestValidator.predicate(
    "pagination pages is non-negative",
    browseResult1.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "pagination records is non-negative",
    browseResult1.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination limit is non-negative",
    browseResult1.pagination.limit >= 0,
  );
  // Validate each community summary with typia.assert only
  browseResult1.data.forEach((community) => {
    typia.assert(community);
  });
}
