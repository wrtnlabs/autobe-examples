import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_community_platform_communities_create } from "../../../generate/generate_random_community_platform_communities_create";
import { prepare_random_community_platform_community } from "../../../prepare/prepare_random_community_platform_community";

export async function test_api_community_create_success_member_owner(
  connection: api.IConnection,
): Promise<void> {
  // 1) Create an authenticated member
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
    } satisfies ICommunityPlatformMember.IJoin,
  });
  typia.assert(memberAuth);
  const requestBody = {
    name: `${RandomGenerator.alphabets(12)}`,
    description: RandomGenerator.paragraph({ sentences: 2 }),
    icon_href: `https://example.com/icon/${RandomGenerator.alphabets(10)}.png`,
  } satisfies ICommunityPlatformCommunity.ICreate;
  // 2) Create community as authenticated member
  const created = await generate_random_community_platform_communities_create(
    memberConnection,
    {
      body: requestBody,
    },
  );
  typia.assert(created);
  // 3) Validate response content matches request
  TestValidator.equals(
    "community.name matches request",
    created.name,
    requestBody.name,
  );
  TestValidator.equals(
    "community.description matches request",
    created.description,
    requestBody.description,
  );
  TestValidator.equals(
    "community.iconHref matches request",
    created.iconHref,
    requestBody.icon_href,
  );
  TestValidator.equals("community.deletedAt is null", created.deletedAt, null);
  // 4) Validate ownership
  TestValidator.equals(
    "owner.id matches authenticated member",
    created.owner.id,
    memberAuth.id,
  );
  // 6) Validate discoverability with GET by id
  const fetched = await api.functional.communityPlatform.communities.at(
    memberConnection,
    {
      communityId: created.id,
    },
  );
  typia.assert(fetched);
  TestValidator.equals("community.id matches", fetched.id, created.id);
  TestValidator.equals("community.name matches", fetched.name, created.name);
  TestValidator.equals(
    "community.description matches",
    fetched.description,
    created.description,
  );
  TestValidator.equals(
    "community.iconHref matches",
    fetched.iconHref,
    created.iconHref,
  );
  TestValidator.equals("community.deletedAt is null", fetched.deletedAt, null);
  TestValidator.equals(
    "owner.id matches after fetch",
    fetched.owner.id,
    created.owner.id,
  );
}
