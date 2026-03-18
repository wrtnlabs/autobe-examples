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
import { generate_random_community_platform_communities_create } from "../../../generate/generate_random_community_platform_communities_create";
import { prepare_random_community_platform_community } from "../../../prepare/prepare_random_community_platform_community";

export async function test_api_community_create_unique_name_collision(
  connection: api.IConnection,
): Promise<void> {
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
    } satisfies ICommunityPlatformMember.IJoin,
  });
  typia.assert(member);
  const communityName = `community-${typia.random<string & tags.Format<"uuid">>()}`;
  const iconHref1 = `https://example.com/icon-${typia.random<string & tags.Format<"uuid">>()}.png`;
  const iconHref2 = `https://example.com/icon-${typia.random<string & tags.Format<"uuid">>()}.png`;
  const description1 = RandomGenerator.paragraph({ sentences: 2 });
  const description2 = RandomGenerator.paragraph({ sentences: 3 });
  const created1 = await generate_random_community_platform_communities_create(
    memberConnection,
    {
      body: {
        name: communityName,
        description: description1,
        icon_href: iconHref1,
      } satisfies ICommunityPlatformCommunity.ICreate,
    },
  );
  typia.assert(created1);
  await TestValidator.error("reject duplicate community name", async () => {
    await generate_random_community_platform_communities_create(
      memberConnection,
      {
        body: {
          name: communityName,
          description: description2,
          icon_href: iconHref2,
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  });
  const page = await api.functional.communityPlatform.communities.index(
    memberConnection,
    {
      body: {
        search: communityName,
        page: 1 satisfies number & tags.Type<"int32"> & tags.Minimum<1>,
        limit: 10 satisfies number & tags.Type<"int32"> & tags.Minimum<1>,
      } satisfies ICommunityPlatformCommunity.IRequest,
    },
  );
  typia.assert(page);
  TestValidator.predicate(
    "only one community exists for duplicated name",
    page.data.filter((c) => c.name === communityName).length === 1,
  );
}
