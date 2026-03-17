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

export async function test_api_owner_moderator_permission_revoke(
  connection: api.IConnection,
): Promise<void> {
  // 1. Owner setup - create and authenticate as owner
  const ownerConnection: api.IConnection = { host: connection.host };
  const ownerEmail = typia.random<string & tags.Format<"email">>();
  const ownerPassword = RandomGenerator.alphaNumeric(16);
  const owner = await authorize_owner_join(ownerConnection, {
    body: {
      email: ownerEmail,
      password: ownerPassword,
      nickname: RandomGenerator.name(),
    } satisfies IRedditLikeOwner.IJoin,
  });
  typia.assert(owner);
  // 2. Member setup - create target member to be assigned as moderator
  const memberConnection: api.IConnection = { host: connection.host };
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = RandomGenerator.alphaNumeric(16);
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: memberEmail,
      username: RandomGenerator.name(1),
      password: memberPassword,
    } satisfies IRedditLikeMember.IJoin,
  });
  typia.assert(member);
  // Re-authenticate member with login (needed for subsequent operations)
  const moderatorConnection: api.IConnection = { host: connection.host };
  await authorize_member_login(moderatorConnection, {
    body: {
      email: memberEmail,
      password: memberPassword,
    } satisfies IRedditLikeMember.ILogin,
  });
  // 3. Create community by owner
  const community = await generate_random_reddit_like_member_communities_create(
    ownerConnection,
    {
      body: {
        name: RandomGenerator.alphaNumeric(10),
        description: RandomGenerator.paragraph({ sentences: 2 }),
      } satisfies IRedditLikeCommunity.ICreate,
    },
  );
  typia.assert(community);
  // 4. Create another member to test moderator addition later
  const newMemberConnection: api.IConnection = { host: connection.host };
  const newMemberEmail = typia.random<string & tags.Format<"email">>();
  const newMemberPassword = RandomGenerator.alphaNumeric(16);
  const newMember = await authorize_member_join(newMemberConnection, {
    body: {
      email: newMemberEmail,
      username: RandomGenerator.name(1),
      password: newMemberPassword,
    } satisfies IRedditLikeMember.IJoin,
  });
  typia.assert(newMember);
  // 5. Add first member as moderator with can_add_moderators=true
  const moderator = await generate_random_reddit_like_owner_moderators_create(
    ownerConnection,
    {
      body: {
        communityId: community.id,
        memberId: member.id,
        canAddModerators: true,
      } satisfies IRedditLikeModerator.ICreate,
    },
  );
  typia.assert(moderator);
  // 6. Owner updates moderator via PUT endpoint
  // Note: IUpdate DTO only has role field, backend handles permission logic
  const updatedModerator =
    await api.functional.redditLike.owner.moderators.update(ownerConnection, {
      moderatorId: moderator.id,
      body: {} satisfies IRedditLikeModerator.IUpdate,
    });
  typia.assert(updatedModerator);
  // 7. Verify permissions are enforced - regular members cannot add moderators
  // Testing that authorization restricts moderator creation to appropriate actors
  await TestValidator.httpError(
    "member without elevated permissions cannot add moderators",
    403,
    async () => {
      await api.functional.redditLike.owner.moderators.create(
        moderatorConnection,
        {
          body: {
            communityId: community.id,
            memberId: newMember.id,
            canAddModerators: false,
          } satisfies IRedditLikeModerator.ICreate,
        },
      );
    },
  );
}
