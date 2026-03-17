import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityCommunity";
import type { ICommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityMember";
import type { ICommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPost";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
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

export async function test_api_post_creation_denied_without_subscription(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Register Member A (community owner) with isolated connection
  const memberAConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberAConnection, {});
  // Step 2: Create a community under Member A using the generation utility
  const community = await generate_random_community_member_communities_create(
    memberAConnection,
    {},
  );
  typia.assert(community);
  // Step 3: Register Member B (non-subscribed poster) with isolated connection
  const memberBConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberBConnection, {});
  // Step 4: Primary test - Member B (non-subscribed) tries to create a post
  // This must be rejected with 403 because Member B has no subscription to this community
  await TestValidator.httpError(
    "non-subscribed member cannot create post (403 Forbidden)",
    403,
    async () => {
      await api.functional.community.member.communities.posts.create(
        memberBConnection,
        {
          communityId: community.id,
          body: {
            title: "Unauthorized Post",
            type: "text",
            body: "I am not subscribed",
          } satisfies ICommunityPost.ICreate,
        },
      );
    },
  );
}
