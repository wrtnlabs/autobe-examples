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
import { generate_random_reddit_like_moderator_moderators_create } from "../../../generate/generate_random_reddit_like_moderator_moderators_create";
import { prepare_random_reddit_like_community } from "../../../prepare/prepare_random_reddit_like_community";
import { prepare_random_reddit_like_moderator } from "../../../prepare/prepare_random_reddit_like_moderator";

export async function test_api_moderator_permission_update_forbidden_by_moderator(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create owner and authenticate
  const ownerConnection: api.IConnection = { host: connection.host };
  const ownerEmail = typia.random<string & tags.Format<"email">>();
  const ownerPassword = RandomGenerator.alphaNumeric(16);
  await authorize_owner_join(ownerConnection, {
    body: {
      email: ownerEmail,
      password: ownerPassword,
      nickname: RandomGenerator.name(),
    } satisfies IRedditLikeOwner.IJoin,
  });
  // Step 2: Create target member who will be assigned as moderator
  const targetMember = await authorize_member_join(
    { host: connection.host },
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        username: RandomGenerator.name(1),
        password: RandomGenerator.alphaNumeric(16),
      } satisfies IRedditLikeMember.IJoin,
    },
  );
  // Step 3: Create acting moderator (potential moderator)
  const actingModeratorAuth = await authorize_moderator_join(
    { host: connection.host },
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        username: RandomGenerator.name(1),
        password: RandomGenerator.alphaNumeric(16),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: typia.random<(string & tags.Format<"ipv4">) | null>(),
      } satisfies IRedditLikeModerator.IJoin,
    },
  );
  // Step 4: Owner creates a community
  const community = await generate_random_reddit_like_member_communities_create(
    ownerConnection,
    {
      body: {
        name: RandomGenerator.name(2),
        description: RandomGenerator.paragraph({ sentences: 3 }),
      } satisfies IRedditLikeCommunity.ICreate,
    },
  );
  // Step 5: Owner assigns target member as moderator
  const targetModerator =
    await generate_random_reddit_like_moderator_moderators_create(
      ownerConnection,
      {
        body: {
          communityId: community.id,
          memberId: targetMember.id,
          canAddModerators: false,
        },
      },
    );
  // Step 6: Owner assigns acting member as moderator
  await generate_random_reddit_like_moderator_moderators_create(
    ownerConnection,
    {
      body: {
        communityId: community.id,
        memberId: actingModeratorAuth.id,
        canAddModerators: true,
      },
    },
  );
  // Step 7: Acting moderator attempts to update target moderator permissions
  // This should fail with 403 Forbidden since only the community owner can update moderator permissions
  await TestValidator.httpError(
    "non-owner moderator should be forbidden from updating moderator permissions",
    403,
    async () => {
      await api.functional.redditLike.moderator.moderators.update(
        { host: connection.host },
        {
          moderatorId: targetModerator.id,
          body: {
            role: "updated",
          } satisfies IRedditLikeModerator.IUpdate,
        },
      );
    },
  );
}
