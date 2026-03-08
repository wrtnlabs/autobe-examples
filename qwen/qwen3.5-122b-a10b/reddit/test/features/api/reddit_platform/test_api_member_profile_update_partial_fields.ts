import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_member_profile_update_partial_fields(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate member via join
  const memberConnection: api.IConnection = { host: connection.host };
  const authResult: IRedditPlatformMember.IAuthorized =
    await authorize_member_join(memberConnection, {
      body: {
        email: typia.random<string & tags.MinLength<1> & tags.MaxLength<255> & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        username: RandomGenerator.name(1),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IRedditPlatformMember.IJoin,
    });
  typia.assert(authResult);
  // 2. Use authResult as initial profile state (avatar should be null initially)
  const initialProfile: IRedditPlatformMember = authResult;
  // 3. Update only displayName and bio (partial update without avatar)
  const newDisplayName: string = RandomGenerator.name(2);
  const newBio: string = RandomGenerator.paragraph({ sentences: 5 });
  const updateBody: IRedditPlatformMember.IUpdate = {
    displayName: newDisplayName,
    bio: newBio,
  } satisfies IRedditPlatformMember.IUpdate;
  const updatedProfile: IRedditPlatformMember =
    await api.functional.redditPlatform.member.profile.update(
      memberConnection,
      {
        body: updateBody,
      },
    );
  typia.assert(updatedProfile);
  // 4. Verify updated fields are correct
  TestValidator.equals(
    "display name updated",
    updatedProfile.display_name,
    newDisplayName,
  );
  TestValidator.equals("bio updated", updatedProfile.bio, newBio);
  // 5. Verify avatar remains unchanged (should still be null or same as initial)
  TestValidator.equals(
    "avatar preserved",
    updatedProfile.avatar,
    initialProfile.avatar,
  );
  // 6. Verify other fields remain unchanged
  TestValidator.equals(
    "username unchanged",
    updatedProfile.username,
    initialProfile.username,
  );
  TestValidator.equals("id unchanged", updatedProfile.id, initialProfile.id);
  TestValidator.equals(
    "karma score unchanged",
    updatedProfile.karma_score,
    initialProfile.karma_score,
  );
  // 7. Verify timestamps are updated
  TestValidator.notEquals(
    "updated_at changed",
    updatedProfile.updated_at,
    initialProfile.updated_at,
  );
  TestValidator.equals(
    "created_at unchanged",
    updatedProfile.created_at,
    initialProfile.created_at,
  );
}