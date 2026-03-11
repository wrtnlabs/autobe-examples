import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditLikeAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeAdmin";
import type { IRedditLikeCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunity";
import type { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import type { IRedditLikeModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeModerator";
import type { IRedditLikeModeratorRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeModeratorRole";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { authorize_moderator_join } from "../../../authorize/authorize_moderator_join";
import { authorize_moderator_login } from "../../../authorize/authorize_moderator_login";
import { authorize_moderator_refresh } from "../../../authorize/authorize_moderator_refresh";
import { generate_random_reddit_like_admin_communities_moderator_roles_create } from "../../../generate/generate_random_reddit_like_admin_communities_moderator_roles_create";
import { generate_random_reddit_like_member_communities_create } from "../../../generate/generate_random_reddit_like_member_communities_create";
import { prepare_random_reddit_like_community } from "../../../prepare/prepare_random_reddit_like_community";
import { prepare_random_reddit_like_moderator_role } from "../../../prepare/prepare_random_reddit_like_moderator_role";

export async function test_api_moderator_role_retrieval_by_owner(
  connection: api.IConnection,
): Promise<void> {
  // 1. Auth as owner (moderator) to create community
  const ownerConnection: api.IConnection = { host: connection.host };
  const owner = await authorize_moderator_join(ownerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(1),
      display_name: RandomGenerator.name(),
    },
  });
  // 2. Owner creates community
  const community = await generate_random_reddit_like_member_communities_create(
    ownerConnection,
    {
      body: {
        name: `community_${RandomGenerator.alphabets(8)}`,
      },
    },
  );
  typia.assert(community);
  // 3. Auth as moderator to be added
  const moderatorConnection: api.IConnection = { host: connection.host };
  const moderator = await authorize_moderator_join(moderatorConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(1),
      display_name: RandomGenerator.name(),
    },
  });
  // 4. Owner adds moderator role
  const moderatorRole =
    await generate_random_reddit_like_admin_communities_moderator_roles_create(
      ownerConnection,
      {
        body: {
          role: "moderator",
        },
        params: {
          communityId: community.id,
        },
      },
    );
  typia.assert(moderatorRole);
  // 5. Owner retrieves specific moderator role
  const retrievedRole =
    await api.functional.redditLike.moderator.moderator_roles.at(
      ownerConnection,
      {
        moderatorRoleId: moderatorRole.id,
      },
    );
  typia.assert(retrievedRole);
  // 6. Validate retrieved role matches created role
  // Extract ISummary-compatible community summary
  const communitySummary: IRedditLikeCommunity.ISummary = {
    name: community.name,
    icon_url: community.icon_url ?? null,
    subscriber_count: community.subscriber_count satisfies number as number &
      tags.Type<"int32"> &
      tags.Minimum<0>,
  };
  TestValidator.equals(
    "retrieved role matches created",
    retrievedRole,
    moderatorRole,
  );
  TestValidator.equals(
    "role type is moderator",
    retrievedRole.role,
    "moderator",
  );
  TestValidator.equals(
    "community matches",
    retrievedRole.community,
    communitySummary,
  );
  TestValidator.predicate("has user summary", Boolean(retrievedRole.user.id));
  TestValidator.predicate(
    "has created_at timestamp",
    Boolean(retrievedRole.created_at),
  );
}
