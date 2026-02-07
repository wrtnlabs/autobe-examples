import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityAdmin";
import type { ICommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPost";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPost";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_community_admin_feed_by_community_id(
  connection: api.IConnection,
): Promise<void> {
  // Authenticate as admin using utility function
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: typia.random<ICommunityAdmin.IJoin>(),
  });
  // Generate a random community ID (uuid) for testing
  const communityId = typia.random<string & tags.Format<"uuid">>();
  // Define sort algorithm - one of: 'hot', 'new', 'top', 'controversial'
  const sortAlgorithms = ["hot", "new", "top", "controversial"] as const;
  const sortAlgorithm = RandomGenerator.pick(sortAlgorithms);
  // Create request body with sort_algorithm
  // Note: ICommunityPost.IRequest is an empty object {}, so no properties can be set
  // The API accepts an empty object as valid for IRequest
  const body: ICommunityPost.IRequest = {} satisfies ICommunityPost.IRequest;
  // Call the API endpoint
  const response = await api.functional.community.admin.feed.community.index(
    adminConnection,
    {
      communityId,
      body,
    },
  );
  typia.assert<IPageICommunityPost.ISummary>(response);
  // Validate pagination metadata - these properties exist in IPage.IPagination
  TestValidator.equals(
    "pagination current page is at least 1",
    response.pagination.current,
    1,
  );
  TestValidator.predicate(
    "pagination limit is positive",
    response.pagination.limit > 0,
  );
  TestValidator.predicate(
    "pagination records is non-negative",
    response.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages is non-negative",
    response.pagination.pages >= 0,
  );
  // Validate that data array exists and contains items
  // Since ICommunityPost.ISummary is empty, we can't validate individual properties
  // We only verify the structure as defined in the schema: data is an array of empty objects
  TestValidator.predicate("data array exists", Array.isArray(response.data));
  // Validate that the API returns at least one post as required by typical pagination
  // The scenario requires posts to be returned (filtered by status), so we expect non-empty array
  TestValidator.predicate(
    "at least one post returned",
    response.data.length > 0,
  );
}
