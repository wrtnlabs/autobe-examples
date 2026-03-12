import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Test that an authenticated member can update their profile avatar image by providing a valid avatar_uri.
 *
 * Test flow:
 * 1. Member authenticates successfully using authorize_member_join utility
 * 2. Member sends PUT request with display_name and avatar_uri (valid URI format)
 * 3. Response returns updated member profile with the new avatar_uri
 * 4. The avatar_uri is stored and displayed correctly on the member's public profile
 * 5. Optional bio field can be null or omitted while still updating avatar
 */
export async function test_api_member_profile_update_with_avatar_uri(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member authentication
  const memberConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.alphabets(8),
      display_name: RandomGenerator.name(2),
      bio: null,
      avatar_uri: null,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IRedditCloneMember.IJoin,
  });
  typia.assert(authorized);
  // 2. Prepare profile update with avatar_uri
  const newAvatarUri: string & tags.Format<"uri"> = typia.random<
    string & tags.Format<"uri">
  >();
  const newDisplayName: string & tags.MinLength<3> & tags.MaxLength<50> =
    RandomGenerator.name(2);
  const updateBody = {
    display_name: newDisplayName,
    avatar_uri: newAvatarUri,
    bio: null,
  } satisfies IRedditCloneMember.IUpdate;
  // 3. Update profile
  const updatedProfile = await api.functional.redditClone.member.profile.update(
    memberConnection,
    {
      body: updateBody,
    },
  );
  typia.assert(updatedProfile);
  // 4. Verify avatar_uri is stored correctly
  TestValidator.equals(
    "avatar_uri matches input",
    updatedProfile.avatar_uri,
    newAvatarUri,
  );
  // 5. Verify display_name is updated
  TestValidator.equals(
    "display_name matches input",
    updatedProfile.display_name,
    newDisplayName,
  );
  // 6. Verify bio is null
  TestValidator.equals("bio is null", updatedProfile.bio, null);
  // 7. Verify other fields remain unchanged
  TestValidator.equals("id unchanged", updatedProfile.id, authorized.id);
  TestValidator.equals(
    "email unchanged",
    updatedProfile.email,
    authorized.email,
  );
  TestValidator.equals(
    "username unchanged",
    updatedProfile.username,
    authorized.username,
  );
  // 8. Verify updated_at is set
  TestValidator.predicate(
    "updated_at exists",
    updatedProfile.updated_at !== null,
  );
}
