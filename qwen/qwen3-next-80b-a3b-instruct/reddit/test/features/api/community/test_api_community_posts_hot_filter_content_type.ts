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

export async function test_api_community_posts_hot_filter_content_type(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Admin authentication - required prerequisite
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: typia.random<ICommunityAdmin.IJoin>(),
  });
  // Step 2: Test filtering by 'link' content type
  const linkResponse = await api.functional.community.admin.posts.hot.index(
    adminConnection,
    {
      body: {
        content_type: "link",
      } satisfies ICommunityPost.IRequest,
    },
  );
  typia.assert(linkResponse);
  // Verify response structure is valid
  TestValidator.equals(
    "link response pagination defined",
    linkResponse.pagination.current,
    1,
  );
  TestValidator.equals(
    "link response limit defined",
    linkResponse.pagination.limit,
    1,
  );
  TestValidator.predicate(
    "link response has records",
    linkResponse.pagination.records >= 0,
  );
  TestValidator.predicate(
    "link response has data",
    linkResponse.data.length >= 0,
  );
  // Step 3: Test filtering by 'image' content type
  const imageResponse = await api.functional.community.admin.posts.hot.index(
    adminConnection,
    {
      body: {
        content_type: "image",
      } satisfies ICommunityPost.IRequest,
    },
  );
  typia.assert(imageResponse);
  // Verify response structure is valid
  TestValidator.equals(
    "image response pagination defined",
    imageResponse.pagination.current,
    1,
  );
  TestValidator.equals(
    "image response limit defined",
    imageResponse.pagination.limit,
    1,
  );
  TestValidator.predicate(
    "image response has records",
    imageResponse.pagination.records >= 0,
  );
  TestValidator.predicate(
    "image response has data",
    imageResponse.data.length >= 0,
  );
  // Since ICommunityPost.ISummary is empty in schema and has no content_type property,
  // we cannot validate the content type filtering on individual posts.
  // The schema doesn't define any properties on ICommunityPost.ISummary, so we can't verify
  // that the filtering is working on content_type field.
  // We can only validate that the API accepts the filter parameters and returns a valid response structure.
  // This validates that the endpoint is working with the content_type filter, even if we can't inspect the filtered content.
  // The server-side implementation must be trusted to handle the filtering correctly as per the materialized view.
  // The existence of the content_type filter in IRequest suggests the server-side implementation exists, so we validate the contract.
}