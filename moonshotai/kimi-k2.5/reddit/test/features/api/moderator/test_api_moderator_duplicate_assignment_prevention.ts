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

export async function test_api_moderator_duplicate_assignment_prevention(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Authenticate as owner
  const ownerConnection: api.IConnection = { host: connection.host };
  const owner = await authorize_owner_join(ownerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      nickname: RandomGenerator.name(),
    } satisfies IRedditLikeOwner.IJoin,
  });
  typia.assert(owner);
  // Step 2: Create a community
  const community = await generate_random_reddit_like_member_communities_create(
    ownerConnection,
    {
      body: {
        name: RandomGenerator.name(),
        description: RandomGenerator.paragraph({ sentences: 3 }),
      } satisfies IRedditLikeCommunity.ICreate,
    },
  );
  typia.assert(community);
  // Step 3: Create a moderator user (they need to be a member first to become a moderator)
  const moderatorConnection: api.IConnection = { host: connection.host };
  const moderatorUser = await authorize_moderator_join(moderatorConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      username: RandomGenerator.name(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<(string & tags.Format<"ipv4">) | null>(),
    } satisfies IRedditLikeModerator.IJoin,
  });
  typia.assert(moderatorUser);
  // Step 4: Owner makes the moderator user an actual moderator with canAddModerators permission
  const moderatorRole =
    await api.functional.redditLike.moderator.moderators.create(
      ownerConnection,
      {
        body: {
          communityId: community.id,
          memberId: moderatorUser.member.id,
          canAddModerators: true,
        } satisfies IRedditLikeModerator.ICreate,
      },
    );
  typia.assert(moderatorRole);
  // Step 5: Create a member who will be added as moderator
  const memberConnection: api.IConnection = { host: connection.host };
  const targetMember = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      username: RandomGenerator.name(),
      password: typia.random<string & tags.Format<"password"> & tags.MinLength<8>>(),
    } satisfies IRedditLikeMember.IJoin,
  });
  typia.assert(targetMember);
  // Step 6: Moderator adds the member as moderator (first attempt - should succeed)
  const firstModeratorAssignment =
    await api.functional.redditLike.moderator.moderators.create(
      moderatorConnection,
      {
        body: {
          communityId: community.id,
          memberId: targetMember.id,
          canAddModerators: false,
        } satisfies IRedditLikeModerator.ICreate,
      },
    );
  typia.assert(firstModeratorAssignment);
  // Step 7: Attempt to add the same member as moderator again (should fail with duplicate error)
  await TestValidator.error("duplicate moderator assignment", async () => {
    await api.functional.redditLike.moderator.moderators.create(
      moderatorConnection,
      {
        body: {
          communityId: community.id,
          memberId: targetMember.id,
          canAddModerators: false,
        } satisfies IRedditLikeModerator.ICreate,
      },
    );
  });
}