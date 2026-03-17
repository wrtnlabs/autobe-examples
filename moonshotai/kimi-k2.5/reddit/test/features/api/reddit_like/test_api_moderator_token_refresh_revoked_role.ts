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
import { authorize_moderator_join } from "../../../authorize/authorize_moderator_join";
import { authorize_moderator_login } from "../../../authorize/authorize_moderator_login";
import { authorize_moderator_refresh } from "../../../authorize/authorize_moderator_refresh";
import { authorize_owner_join } from "../../../authorize/authorize_owner_join";
import { authorize_owner_login } from "../../../authorize/authorize_owner_login";
import { authorize_owner_refresh } from "../../../authorize/authorize_owner_refresh";
import { generate_random_reddit_like_member_communities_create } from "../../../generate/generate_random_reddit_like_member_communities_create";
import { generate_random_reddit_like_owner_moderators_create } from "../../../generate/generate_random_reddit_like_owner_moderators_create";
import { prepare_random_reddit_like_community } from "../../../prepare/prepare_random_reddit_like_community";
import { prepare_random_reddit_like_moderator } from "../../../prepare/prepare_random_reddit_like_moderator";

export async function test_api_moderator_token_refresh_revoked_role(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member account
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {});
  typia.assert(member);
  // 2. Create owner account
  const ownerConnection: api.IConnection = { host: connection.host };
  const owner = await authorize_owner_join(ownerConnection, {});
  typia.assert(owner);
  // 3. Create community as owner
  const community = await generate_random_reddit_like_member_communities_create(
    ownerConnection,
    {},
  );
  typia.assert(community);
  // 4. Assign member as moderator
  const moderator = await generate_random_reddit_like_owner_moderators_create(
    ownerConnection,
    {
      body: {
        communityId: community.id,
        memberId: member.id,
      } satisfies Partial<IRedditLikeModerator.ICreate>,
    },
  );
  typia.assert(moderator);
  typia.assertGuard(moderator.deleted_at);
  TestValidator.equals(
    "Moderator should be active initially",
    moderator.deleted_at,
    null,
  );
  // 5. Login as moderator with member credentials
  const moderatorConnection: api.IConnection = { host: connection.host };
  const moderatorAuth = await authorize_moderator_login(moderatorConnection, {
    body: {
      email: member.email,
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IRedditLikeModerator.ILogin,
  });
  typia.assert(moderatorAuth);
  // Test that refresh works while role is active
  const refreshed = await authorize_moderator_refresh(moderatorConnection, {
    body: {
      refreshToken: moderatorAuth.token.refresh,
    } satisfies IRedditLikeModerator.IRefresh,
  });
  typia.assert(refreshed);
}
