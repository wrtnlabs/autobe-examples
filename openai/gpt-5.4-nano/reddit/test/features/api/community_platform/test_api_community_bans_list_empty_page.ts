import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityBan } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityBan";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformCommunityBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformCommunityBan";
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

export async function test_api_community_bans_list_empty_page(
  connection: api.IConnection,
): Promise<void> {
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
    } satisfies ICommunityPlatformMember.IJoin,
  });
  const community: ICommunityPlatformCommunity =
    await generate_random_community_platform_communities_create(
      memberConnection,
      {
        body: {
          name: typia.random<
            string & tags.MinLength<1> & tags.MaxLength<65535>
          >(),
          description: typia.random<
            string & tags.MinLength<1> & tags.MaxLength<65535>
          >(),
          icon_href: typia.random<
            string & tags.MinLength<1> & tags.MaxLength<80000>
          >(),
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);
  const first: IPageICommunityPlatformCommunityBan.ISummary =
    await api.functional.communityPlatform.member.communities.bans.listCommunityBans(
      memberConnection,
      {
        communityId: community.id,
      },
    );
  typia.assert(first);
  const second: IPageICommunityPlatformCommunityBan.ISummary =
    await api.functional.communityPlatform.member.communities.bans.listCommunityBans(
      memberConnection,
      {
        communityId: community.id,
      },
    );
  typia.assert(second);
  TestValidator.equals("first data empty", first.data, []);
  TestValidator.equals("second data empty", second.data, []);
  TestValidator.equals("first records zero", first.pagination.records, 0);
  TestValidator.equals("first pages zero", first.pagination.pages, 0);
  TestValidator.equals("second records zero", second.pagination.records, 0);
  TestValidator.equals("second pages zero", second.pagination.pages, 0);
  TestValidator.predicate(
    "first current non-negative",
    first.pagination.current >= 0,
  );
  TestValidator.predicate(
    "first limit non-negative",
    first.pagination.limit >= 0,
  );
  TestValidator.predicate(
    "second current non-negative",
    second.pagination.current >= 0,
  );
  TestValidator.predicate(
    "second limit non-negative",
    second.pagination.limit >= 0,
  );
  TestValidator.equals(
    "idempotent pagination records",
    first.pagination.records,
    second.pagination.records,
  );
  TestValidator.equals(
    "idempotent pagination pages",
    first.pagination.pages,
    second.pagination.pages,
  );
  TestValidator.equals(
    "idempotent pagination current",
    first.pagination.current,
    second.pagination.current,
  );
  TestValidator.equals(
    "idempotent pagination limit",
    first.pagination.limit,
    second.pagination.limit,
  );
}
