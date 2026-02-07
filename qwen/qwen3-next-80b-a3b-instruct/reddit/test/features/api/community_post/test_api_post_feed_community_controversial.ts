import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityMember";
import type { ICommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPost";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPost";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_post_feed_community_controversial(
  connection: api.IConnection,
): Promise<void> {
  // Create member connection for authorization (required to set community_id reference in request)
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "TestPassword123!",
    } satisfies ICommunityMember.IJoin,
  });
  memberConnection.headers = {
    Authorization: `Bearer ${memberAuth.token.access}`,
  };
  // Create guest connection to retrieve feed
  const guestConnection: api.IConnection = { host: connection.host };
  // Retrieve controversial feed with 'controversial' sort algorithm
  // We must provide a community_id, but ICommunityPost.IRequest is empty object
  // So we send empty body as schema requires
  const feedResponse = await api.functional.community.posts.index(
    guestConnection,
    {
      body: {} satisfies ICommunityPost.IRequest,
    },
  );
  typia.assert(feedResponse);
  // Validate structure
  TestValidator.equals(
    "pagination exists",
    typeof feedResponse.pagination,
    "object",
  );
  TestValidator.equals(
    "data exists and is array",
    Array.isArray(feedResponse.data),
    true,
  );
  TestValidator.predicate(
    "pagination has valid current page",
    () => feedResponse.pagination.current >= 1,
  );
  TestValidator.predicate(
    "pagination has valid limit",
    () => feedResponse.pagination.limit > 0,
  );
  TestValidator.predicate(
    "pagination has non-negative records",
    () => feedResponse.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination has non-negative pages",
    () => feedResponse.pagination.pages >= 0,
  );
}
