import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_member_profile_update_display_name_only(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member connection and authenticate with initial bio
  const memberConnection: api.IConnection = { host: connection.host };
  const initialProfile = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      displayName: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 3 }),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IDiscussionBoardMember.IJoin,
  });
  typia.assert(initialProfile);
  // Store original values for validation
  const originalBio = initialProfile.bio;
  const originalDisplayName = initialProfile.display_name;
  const originalUpdatedAt = initialProfile.updated_at;
  // 2. Update profile with only displayName (no bio field)
  const newDisplayName = RandomGenerator.name();
  const updatedProfile =
    await api.functional.discussionBoard.member.profile.update(
      memberConnection,
      {
        body: {
          displayName: newDisplayName,
        } satisfies IDiscussionBoardMember.IUpdate,
      },
    );
  typia.assert(updatedProfile);
  // 3. Validate displayName changed
  TestValidator.equals(
    "display name updated",
    updatedProfile.display_name,
    newDisplayName,
  );
  // 4. Validate bio remains unchanged
  TestValidator.equals("bio preserved", updatedProfile.bio, originalBio);
  // 5. Validate updated_at timestamp is refreshed
  TestValidator.predicate(
    "updated_at refreshed",
    updatedProfile.updated_at > originalUpdatedAt,
  );
  // 6. Validate other fields remain unchanged
  TestValidator.equals("id unchanged", updatedProfile.id, initialProfile.id);
  TestValidator.equals(
    "ban_status unchanged",
    updatedProfile.ban_status,
    initialProfile.ban_status,
  );
  TestValidator.equals(
    "created_at unchanged",
    updatedProfile.created_at,
    initialProfile.created_at,
  );
}
