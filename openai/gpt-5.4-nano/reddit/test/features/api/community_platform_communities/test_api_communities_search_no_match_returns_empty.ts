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

export async function test_api_communities_search_no_match_returns_empty(
  connection: api.IConnection,
): Promise<void> {
  // 1) Register a new authenticated member account
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
    },
  });
  // 2) Search with a name that should not match anything
  const searchTerm = `__nonexistent_community_name_${RandomGenerator.alphabets(12)}`;
  const page = 1 satisfies number & tags.Type<"int32"> & tags.Minimum<1>;
  const limit = 10 satisfies number & tags.Type<"int32"> & tags.Minimum<1>;
  const response = await api.functional.communityPlatform.communities.index(
    memberConnection,
    {
      body: {
        search: searchTerm,
        page,
        limit,
      } satisfies ICommunityPlatformCommunity.IRequest,
    },
  );
  typia.assert(response);
  // 3) Validate empty results and pagination metadata
  TestValidator.equals("records should be 0", response.pagination.records, 0);
  TestValidator.equals("pages should be 0", response.pagination.pages, 0);
  TestValidator.equals("data should be empty", response.data.length, 0);
}
