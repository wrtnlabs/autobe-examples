import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IREdditLikeCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityCommunity";
import type { IREdditLikeCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_like_community_member_communities_create } from "../../../generate/generate_random_reddit_like_community_member_communities_create";
import { prepare_random_reddit_like_community_community } from "../../../prepare/prepare_random_reddit_like_community_community";

export async function test_api_community_deletion_by_non_creator(
  connection: api.IConnection,
): Promise<void> {
  const creatorConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(creatorConnection, { body: {} });
  const community =
    await generate_random_reddit_like_community_member_communities_create(
      creatorConnection,
      { body: undefined },
    );
  typia.assert(community);
  const nonCreatorConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(nonCreatorConnection, { body: {} });
  await TestValidator.httpError(
    "non-creator cannot delete community",
    403,
    async () => {
      await api.functional.redditLikeCommunity.member.communities.erase(
        nonCreatorConnection,
        { communityId: community.id },
      );
    },
  );
}