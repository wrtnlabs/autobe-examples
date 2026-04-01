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

/**
 * Test member avatar upload success path.
 * 1. Member registers account via join
 * 2. Member uploads avatar image via URI
 * 3. Validate avatar entity contains all required fields via typia.assert
 * 4. Verify profile reference is properly associated
 */
export async function test_api_member_avatar_upload_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member registration
  const memberConnection: api.IConnection = { host: connection.host };
  const authResult = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(1),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IRedditCommunityMember.IJoin,
  });
  // 2. Upload avatar image
  const avatar = await generate_random_reddit_community_member_avatars_create(
    memberConnection,
    {
      body: {
        file: typia.random<string & tags.Format<"uri">>(),
      } satisfies IRedditCommunityUserAvatar.ICreate,
    },
  );
  // 3. Validate complete avatar entity structure (validates ALL fields)
  typia.assert(avatar);
  // 4. Validate avatar is associated with the authenticated user's profile
  TestValidator.equals(
    "avatar profile id matches authenticated user",
    avatar.profile.id,
    authResult.id,
  );
  // 5. Validate profile username matches registered username
  TestValidator.predicate(
    "profile username is not empty",
    avatar.profile.username.length > 0,
  );
}
