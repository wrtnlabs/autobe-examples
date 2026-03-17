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

export async function test_api_moderator_retrieval_permission_flags(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create and authenticate members who will become moderators
  const member1Connection: api.IConnection = { host: connection.host };
  const member1: IRedditLikeMember.IAuthorized = await authorize_member_join(
    member1Connection,
    {},
  );
  const member2Connection: api.IConnection = { host: connection.host };
  const member2: IRedditLikeMember.IAuthorized = await authorize_member_join(
    member2Connection,
    {},
  );
  // 2. Create and authenticate owner who will create the community and add moderators
  const ownerConnection: api.IConnection = { host: connection.host };
  const owner: IRedditLikeOwner.IAuthorized = await authorize_owner_join(
    ownerConnection,
    {},
  );
  // 3. Create a community (using owner as member identity)
  const community: IRedditLikeCommunity =
    await generate_random_reddit_like_member_communities_create(
      ownerConnection,
      {
        body: {},
      },
    );
  typia.assert(community);
  // 4. Add first moderator with can_add_moderators=true
  const moderator1: IRedditLikeModerator =
    await generate_random_reddit_like_owner_moderators_create(ownerConnection, {
      body: {
        communityId: community.id,
        memberId: member1.id,
        canAddModerators: true,
      },
    });
  typia.assert(moderator1);
  // 5. Add second moderator with can_add_moderators=false
  const moderator2: IRedditLikeModerator =
    await generate_random_reddit_like_owner_moderators_create(ownerConnection, {
      body: {
        communityId: community.id,
        memberId: member2.id,
        canAddModerators: false,
      },
    });
  typia.assert(moderator2);
  // 6. Retrieve first moderator and verify can_add_moderators=true
  const retrievedModerator1: IRedditLikeModerator =
    await api.functional.redditLike.moderators.at(ownerConnection, {
      moderatorId: moderator1.id,
    });
  typia.assert(retrievedModerator1);
  // Verify moderator1 has elevated permissions
  TestValidator.predicate(
    "moderator1 should have can_add_moderators=true",
    retrievedModerator1.can_add_moderators === true,
  );
  TestValidator.equals(
    "moderator1 member id matches",
    retrievedModerator1.member.id,
    member1.id,
  );
  TestValidator.equals(
    "moderator1 community id matches",
    retrievedModerator1.community.id,
    community.id,
  );
  // 7. Retrieve second moderator and verify can_add_moderators=false
  const retrievedModerator2: IRedditLikeModerator =
    await api.functional.redditLike.moderators.at(ownerConnection, {
      moderatorId: moderator2.id,
    });
  typia.assert(retrievedModerator2);
  // Verify moderator2 has standard permissions
  TestValidator.predicate(
    "moderator2 should have can_add_moderators=false",
    retrievedModerator2.can_add_moderators === false,
  );
  TestValidator.equals(
    "moderator2 member id matches",
    retrievedModerator2.member.id,
    member2.id,
  );
  TestValidator.equals(
    "moderator2 community id matches",
    retrievedModerator2.community.id,
    community.id,
  );
  // 8. Verify both moderators have different permission levels
  TestValidator.notEquals(
    "permission flags should differ between moderators",
    retrievedModerator1.can_add_moderators,
    retrievedModerator2.can_add_moderators,
  );
}
