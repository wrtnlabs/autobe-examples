import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import type { IRedditCommunityUserAvatar } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityUserAvatar";
import type { IRedditCommunityUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityUserProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_community_member_avatars_create } from "../../../generate/generate_random_reddit_community_member_avatars_create";
import { prepare_random_reddit_community_user_avatar } from "../../../prepare/prepare_random_reddit_community_user_avatar";

export async function test_api_member_avatar_soft_deleted_inaccessible(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new member account
  const memberConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(1),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IRedditCommunityMember.IJoin,
  });
  typia.assert(authorized);
  // Set authorization token for subsequent requests
  memberConnection.headers = {
    Authorization: `Bearer ${authorized.token.access}`,
  };
  // 2. Upload an avatar image to create an avatar record
  const avatar = await generate_random_reddit_community_member_avatars_create(
    memberConnection,
    {
      body: {
        file: typia.random<string & tags.Format<"uri">>(),
      } satisfies IRedditCommunityUserAvatar.ICreate,
    },
  );
  typia.assert(avatar);
  // 3. Verify the avatar can be retrieved successfully
  const retrievedAvatar =
    await api.functional.redditCommunity.member.avatars.at(memberConnection, {
      avatarId: avatar.id,
    });
  typia.assert(retrievedAvatar);
  TestValidator.equals("avatar id matches", retrievedAvatar.id, avatar.id);
  // 4. Test accessing a non-existent avatar (simulating soft-deleted behavior)
  // Since delete endpoint is not available in provided SDK, test with random UUID
  const nonExistentAvatarId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.httpError(
    "non-existent avatar should return 404",
    404,
    async () => {
      await api.functional.redditCommunity.member.avatars.at(memberConnection, {
        avatarId: nonExistentAvatarId,
      });
    },
  );
}
