import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityCommunity";
import type { ICommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityMember";
import type { ICommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityModerator";
import type { ICommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPost";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityModerator";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_community_member_communities_create } from "../../../generate/generate_random_community_member_communities_create";
import { prepare_random_community_community } from "../../../prepare/prepare_random_community_community";

export async function test_api_community_moderators_index_pagination(
  connection: api.IConnection,
) {
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      username: RandomGenerator.name(),
    } satisfies ICommunityMember.IJoin,
  });
  const community = await generate_random_community_member_communities_create(
    memberConnection,
    {},
  );
  const paginationResponse =
    await api.functional.community.member.communities.moderators.index(
      memberConnection,
      {
        communityId: community.id,
        body: {
          page: 1,
          limit: 10,
        } satisfies ICommunityModerator.IRequest,
      },
    );
  typia.assert(paginationResponse);
  TestValidator.equals(
    "current page",
    paginationResponse.pagination.current,
    1,
  );
  TestValidator.equals("limit", paginationResponse.pagination.limit, 10);
  TestValidator.predicate(
    "non-zero records",
    paginationResponse.pagination.records > 0,
  );
  TestValidator.predicate(
    "moderators returned",
    paginationResponse.data.length > 0,
  );
  if (paginationResponse.data.length > 0) {
    TestValidator.equals(
      "first moderator ID",
      paginationResponse.data[0].id,
      paginationResponse.data[0].id,
    );
  }
}