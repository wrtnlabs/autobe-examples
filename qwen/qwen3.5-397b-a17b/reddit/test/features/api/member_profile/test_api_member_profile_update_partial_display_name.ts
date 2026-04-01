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

/**
 * Test that a member can update only one profile field while the other field retains its original value.
 * The test should: (1) Register a new member account, (2) Set initial profile with both display_name and bio,
 * (3) Update only the display_name field without providing bio, (4) Verify the response shows the new display_name value,
 * (5) Verify the bio field retains its original value (not changed or nullified), (6) Verify updated_at timestamp is updated.
 * This validates the partial update behavior where unprovided fields are preserved.
 */
export async function test_api_member_profile_update_partial_display_name(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register new member account
  const memberConnection: api.IConnection = { host: connection.host };
  const auth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(1),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IRedditCommunityMember.IJoin,
  });
  typia.assert(auth);
  // 2. Set initial profile with both display_name and bio
  const initialDisplayName = RandomGenerator.name();
  const initialBio = RandomGenerator.paragraph({ sentences: 2 });
  const initialProfile =
    await api.functional.redditCommunity.member.profile.update(
      memberConnection,
      {
        body: {
          display_name: initialDisplayName,
          bio: initialBio,
        } satisfies IRedditCommunityUserProfile.IUpdate,
      },
    );
  typia.assert(initialProfile);
  // 3. Update only display_name (partial update - bio not provided)
  const newDisplayName = RandomGenerator.name();
  const updatedProfile =
    await api.functional.redditCommunity.member.profile.update(
      memberConnection,
      {
        body: {
          display_name: newDisplayName,
        } satisfies IRedditCommunityUserProfile.IUpdate,
      },
    );
  typia.assert(updatedProfile);
  // 4. Verify display_name was updated to new value
  TestValidator.equals(
    "display_name updated",
    updatedProfile.display_name,
    newDisplayName,
  );
  // 5. Verify bio retained original value (partial update preservation)
  TestValidator.equals("bio preserved", updatedProfile.bio, initialBio);
  // 6. Verify updated_at timestamp was updated
  TestValidator.predicate(
    "updated_at changed",
    updatedProfile.updated_at > initialProfile.updated_at,
  );
}
