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

export async function test_api_member_avatar_replace_existing(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as member
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
  typia.assert(authResult);
  // 2. Upload initial avatar
  const firstAvatar =
    await generate_random_reddit_community_member_avatars_create(
      memberConnection,
      {
        body: {
          file: typia.random<string & tags.Format<"uri">>(),
        } satisfies IRedditCommunityUserAvatar.ICreate,
      },
    );
  typia.assert(firstAvatar);
  // 3. Upload second avatar (replacement)
  const secondAvatar =
    await generate_random_reddit_community_member_avatars_create(
      memberConnection,
      {
        body: {
          file: typia.random<string & tags.Format<"uri">>(),
        } satisfies IRedditCommunityUserAvatar.ICreate,
      },
    );
  typia.assert(secondAvatar);
  // 4. Validate both avatars exist and have different IDs
  TestValidator.notEquals("avatar IDs differ", firstAvatar.id, secondAvatar.id);
  TestValidator.equals(
    "same profile owner",
    firstAvatar.profile.id,
    secondAvatar.profile.id,
  );
  // 5. Validate second avatar has different file metadata
  TestValidator.notEquals(
    "file names differ",
    firstAvatar.file_name,
    secondAvatar.file_name,
  );
  TestValidator.notEquals(
    "storage paths differ",
    firstAvatar.storage_path,
    secondAvatar.storage_path,
  );
  // 6. Validate timestamps - second avatar should be created after first
  const firstCreatedAt = new Date(firstAvatar.created_at).getTime();
  const secondCreatedAt = new Date(secondAvatar.created_at).getTime();
  TestValidator.predicate(
    "second avatar created after first",
    secondCreatedAt >= firstCreatedAt,
  );
}
