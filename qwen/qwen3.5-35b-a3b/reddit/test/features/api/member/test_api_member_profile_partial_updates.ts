import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import type { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_member_profile_partial_updates(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member account
  const memberConnection: api.IConnection = { host: connection.host };
  const joinResult = await api.functional.redditPlatform.auth.member.join(
    memberConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        username: typia.random<
          string &
            tags.MinLength<3> &
            tags.MaxLength<20> &
            tags.Pattern<"^[a-zA-Z0-9_]+$">
        >(),
        password: RandomGenerator.alphaNumeric(16),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: typia.random<string & tags.Format<"ipv4">>(),
      } satisfies IRedditPlatformMember.IJoin,
    },
  );
  typia.assert(joinResult);
  // 2. Capture initial profile state
  const initialProfile = joinResult;
  const initialDisplayName = initialProfile.displayName;
  const initialBio = initialProfile.bio;
  const initialAvatarUrl = initialProfile.avatarUrl;
  // 3. First update - change only display_name
  const newDisplayName = RandomGenerator.name();
  const displayNameUpdateBody = {
    display_name: newDisplayName,
  } satisfies DeepPartial<IRedditPlatformMember.IUpdate>;
  const afterDisplayNameUpdate =
    await api.functional.redditPlatform.member.profile.update(
      memberConnection,
      {
        body: displayNameUpdateBody,
      },
    );
  typia.assert(afterDisplayNameUpdate);
  TestValidator.equals(
    "display_name updated",
    afterDisplayNameUpdate.displayName,
    newDisplayName,
  );
  TestValidator.equals(
    "bio unchanged after display_name update",
    afterDisplayNameUpdate.bio,
    initialBio,
  );
  TestValidator.equals(
    "avatar_url unchanged after display_name update",
    afterDisplayNameUpdate.avatarUrl,
    initialAvatarUrl,
  );
  TestValidator.notEquals(
    "updated_at refreshed after display_name update",
    initialProfile.updatedAt,
    afterDisplayNameUpdate.updatedAt,
  );
  // 4. Second update - change only bio
  const newBio = RandomGenerator.paragraph({ sentences: 3 });
  const bioUpdateBody = {
    bio: newBio,
  } satisfies DeepPartial<IRedditPlatformMember.IUpdate>;
  const afterBioUpdate =
    await api.functional.redditPlatform.member.profile.update(
      memberConnection,
      {
        body: bioUpdateBody,
      },
    );
  typia.assert(afterBioUpdate);
  TestValidator.equals(
    "display_name preserved after bio update",
    afterBioUpdate.displayName,
    newDisplayName,
  );
  TestValidator.equals("bio updated", afterBioUpdate.bio, newBio);
  TestValidator.equals(
    "avatar_url unchanged after bio update",
    afterBioUpdate.avatarUrl,
    initialAvatarUrl,
  );
  TestValidator.notEquals(
    "updated_at refreshed after bio update",
    afterDisplayNameUpdate.updatedAt,
    afterBioUpdate.updatedAt,
  );
  // 5. Third update - change only avatar_url
  const newAvatarUrl = "https://example.com/new-avatar.jpg";
  const avatarUrlUpdateBody = {
    avatar_url: newAvatarUrl,
  } satisfies DeepPartial<IRedditPlatformMember.IUpdate>;
  const afterAvatarUrlUpdate =
    await api.functional.redditPlatform.member.profile.update(
      memberConnection,
      {
        body: avatarUrlUpdateBody,
      },
    );
  typia.assert(afterAvatarUrlUpdate);
  TestValidator.equals(
    "display_name preserved after avatar_url update",
    afterAvatarUrlUpdate.displayName,
    newDisplayName,
  );
  TestValidator.equals(
    "bio preserved after avatar_url update",
    afterAvatarUrlUpdate.bio,
    newBio,
  );
  TestValidator.equals(
    "avatar_url updated",
    afterAvatarUrlUpdate.avatarUrl,
    newAvatarUrl,
  );
  TestValidator.notEquals(
    "updated_at refreshed after avatar_url update",
    afterBioUpdate.updatedAt,
    afterAvatarUrlUpdate.updatedAt,
  );
}