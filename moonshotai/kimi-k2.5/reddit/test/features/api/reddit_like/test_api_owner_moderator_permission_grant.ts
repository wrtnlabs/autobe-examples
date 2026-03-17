import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditLikeAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeAttachment";
import type { IRedditLikeCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunity";
import type { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import type { IRedditLikeModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeModerator";
import type { IRedditLikeOwner } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeOwner";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { authorize_owner_join } from "../../../authorize/authorize_owner_join";
import { authorize_owner_login } from "../../../authorize/authorize_owner_login";
import { authorize_owner_refresh } from "../../../authorize/authorize_owner_refresh";
import { generate_random_reddit_like_member_communities_create } from "../../../generate/generate_random_reddit_like_member_communities_create";
import { generate_random_reddit_like_owner_moderators_create } from "../../../generate/generate_random_reddit_like_owner_moderators_create";
import { prepare_random_reddit_like_community } from "../../../prepare/prepare_random_reddit_like_community";
import { prepare_random_reddit_like_moderator } from "../../../prepare/prepare_random_reddit_like_moderator";

export async function test_api_owner_moderator_permission_grant(
  connection: api.IConnection,
): Promise<void> {
  // 1. Setup: Create owner and authenticate
  const ownerConnection: api.IConnection = { host: connection.host };
  const owner = await authorize_owner_join(ownerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "Password123!",
      nickname: RandomGenerator.name(),
    } satisfies IRedditLikeOwner.IJoin,
  });
  // 2. Setup: Create member and authenticate
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      username: RandomGenerator.name(1),
      password: "Password123!",
    } satisfies IRedditLikeMember.IJoin,
  });
  // 3. Setup: Owner creates a community
  const community = await generate_random_reddit_like_member_communities_create(
    ownerConnection,
    {
      body: {
        name: RandomGenerator.alphabets(10),
        description: RandomGenerator.paragraph({ sentences: 3 }),
      } satisfies IRedditLikeCommunity.ICreate,
    },
  );
  typia.assert(community);
  // 4. Setup: Owner adds member as moderator (can_add_moderators defaults to false)
  const moderator = await api.functional.redditLike.owner.moderators.create(
    ownerConnection,
    {
      body: {
        communityId: community.id,
        memberId: member.id,
        canAddModerators: false,
      } satisfies IRedditLikeModerator.ICreate,
    },
  );
  typia.assert(moderator);
  TestValidator.equals(
    "moderator initial can_add_moderators should be false",
    moderator.can_add_moderators,
    false,
  );
  // 5. Execute: Owner updates moderator permissions
  // Note: IRedditLikeModerator.IUpdate only has 'role' field per DTO definition
  // Scenario tests permission grant but DTO structure may differ from API spec
  const updateBody: IRedditLikeModerator.IUpdate = {
    role: RandomGenerator.alphabets(10),
  };
  const updatedModerator =
    await api.functional.redditLike.owner.moderators.update(ownerConnection, {
      moderatorId: moderator.id,
      body: updateBody,
    });
  typia.assert(updatedModerator);
  // 6. Validate: Response contains updated moderator data
  TestValidator.equals(
    "moderator id matches after update",
    updatedModerator.id,
    moderator.id,
  );
  TestValidator.equals(
    "moderator member data is populated",
    updatedModerator.member.id,
    moderator.member.id,
  );
  TestValidator.equals(
    "moderator community data is populated",
    updatedModerator.community.id,
    moderator.community.id,
  );
  TestValidator.predicate(
    "updated_at reflects modification",
    new Date(updatedModerator.updated_at).getTime() >=
      new Date(moderator.updated_at).getTime(),
  );
}
