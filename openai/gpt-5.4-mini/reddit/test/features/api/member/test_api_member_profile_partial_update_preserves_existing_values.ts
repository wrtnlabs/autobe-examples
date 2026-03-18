import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_member_profile_partial_update_preserves_existing_values(
  connection: api.IConnection,
): Promise<void> {
  const memberConnection: api.IConnection = { host: connection.host };
  const email = typia.random<string & tags.Format<"email">>();
  const username = `member_${RandomGenerator.alphabets(8)}`;
  const initialDisplayName = RandomGenerator.name();
  const initialBio = RandomGenerator.paragraph({ sentences: 3 });
  const initialAvatarImageUri = `https://example.com/avatar/${RandomGenerator.alphabets(8)}.png`;
  const authorized = await authorize_member_join(memberConnection, {
    body: {
      email,
      password: "P@ssw0rd1234",
      username,
      displayName: initialDisplayName,
      bio: initialBio,
      avatarImageUri: initialAvatarImageUri,
    } satisfies ICommunityPlatformMember.IJoin,
  });
  typia.assert(authorized);
  const updatedDisplayName = RandomGenerator.name();
  const afterUpdate =
    await api.functional.communityPlatform.member.profile.update(
      memberConnection,
      {
        body: {
          displayName: updatedDisplayName,
        } satisfies ICommunityPlatformMember.IUpdate,
      },
    );
  typia.assert(afterUpdate);
  TestValidator.equals(
    "display name updated",
    afterUpdate.displayName,
    updatedDisplayName,
  );
  TestValidator.equals(
    "bio preserved after partial update",
    afterUpdate.bio,
    initialBio,
  );
  TestValidator.equals(
    "avatar preserved after partial update",
    afterUpdate.avatarImageUri,
    initialAvatarImageUri,
  );
  TestValidator.equals(
    "username preserved after partial update",
    afterUpdate.username,
    username,
  );
  TestValidator.equals(
    "email preserved after partial update",
    afterUpdate.email,
    email,
  );
  TestValidator.equals(
    "karma preserved after partial update",
    afterUpdate.karma,
    authorized.karma,
  );
  TestValidator.equals(
    "member id preserved after partial update",
    afterUpdate.id,
    authorized.id,
  );
  TestValidator.equals(
    "createdAt preserved after partial update",
    afterUpdate.createdAt,
    authorized.createdAt,
  );
  TestValidator.predicate(
    "updatedAt should be at or after previous update time",
    new Date(afterUpdate.updatedAt).getTime() >=
      new Date(authorized.updatedAt).getTime(),
  );
}
