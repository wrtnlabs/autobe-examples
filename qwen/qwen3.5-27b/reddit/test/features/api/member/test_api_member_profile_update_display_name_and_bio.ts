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

export async function test_api_member_profile_update_display_name_and_bio(
  connection: api.IConnection,
): Promise<void> {
  /**
   * Test member profile update with display name and bio.
   * 1. Register a new member account
   * 2. Update profile with new display name and bio
   * 3. Validate the updated profile contains correct values
   */
  // 1. Member registration
  const memberConnection: api.IConnection = { host: connection.host };
  const registeredMember = await authorize_member_join(memberConnection, {
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
  typia.assert(registeredMember);
  // 2. Prepare new display name and bio for update with proper constraints
  const newDisplayName = typia.random<
    string & tags.MinLength<3> & tags.MaxLength<50>
  >() satisfies string;
  const newBio = typia.random<string & tags.MaxLength<500>>() satisfies string;
  // 3. Update member profile
  const updatedProfile = await api.functional.redditClone.member.profile.update(
    memberConnection,
    {
      body: {
        display_name: newDisplayName,
        bio: newBio,
      } satisfies IRedditCloneMember.IUpdate,
    },
  );
  typia.assert(updatedProfile);
  // 4. Validate updated profile
  TestValidator.equals(
    "display name matches input",
    updatedProfile.display_name,
    newDisplayName,
  );
  TestValidator.equals("bio matches input", updatedProfile.bio, newBio);
  TestValidator.predicate(
    "updated_at is valid datetime",
    /^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}/.test(
      updatedProfile.updated_at,
    ),
  );
  TestValidator.predicate(
    "member is not deleted",
    updatedProfile.deleted_at === null,
  );
  TestValidator.equals(
    "username unchanged",
    updatedProfile.username,
    registeredMember.username,
  );
  TestValidator.equals(
    "email unchanged",
    updatedProfile.email,
    registeredMember.email,
  );
}
