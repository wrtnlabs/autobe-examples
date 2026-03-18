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

export async function test_api_communities_discovery_all_includes_subscriber_count(
  connection: api.IConnection,
): Promise<void> {
  // Create authenticated member actor
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
    } satisfies ICommunityPlatformMember.IJoin,
  });
  const response = await api.functional.communityPlatform.communities.index(
    memberConnection,
    {
      body: {
        page: 1,
        limit: 5,
      } satisfies ICommunityPlatformCommunity.IRequest,
    },
  );
  typia.assert(response);
  TestValidator.equals("pagination current", response.pagination.current, 1);
  TestValidator.equals("pagination limit", response.pagination.limit, 5);
  TestValidator.predicate(
    "pagination records non-negative",
    response.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages non-negative",
    response.pagination.pages >= 0,
  );
  for (const community of response.data) {
    // Discoverable communities must not be soft-deleted
    TestValidator.equals(
      "community deleted_at is null",
      community.deleted_at,
      null,
    );
    TestValidator.predicate(
      "subscriber_count is integer",
      Number.isInteger(community.subscriber_count),
    );
    TestValidator.predicate(
      "subscriber_count non-negative",
      community.subscriber_count >= 0,
    );
    TestValidator.predicate(
      "owner display_name non-empty",
      community.owner.display_name.length > 0,
    );
  }
}
