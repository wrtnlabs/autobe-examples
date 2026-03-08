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

export async function test_api_member_profile_display_name_update(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a member with initial displayName and bio
  const memberConnection: api.IConnection = { host: connection.host };
  const initialBio = RandomGenerator.paragraph({ sentences: 3 });
  const authorized = await authorize_member_join(memberConnection, {
    body: {
      displayName: RandomGenerator.name(),
      bio: initialBio,
    },
  });
  typia.assert(authorized);
  // Store original bio for comparison
  const originalBio = authorized.bio;
  // 2. Update profile with new display name, omitting bio field
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
  // 3. Verify the new display name is applied
  TestValidator.equals(
    "display name should be updated",
    updatedProfile.displayName,
    newDisplayName,
  );
  // 4. Verify bio remains unchanged when omitted from update
  TestValidator.equals(
    "bio should remain unchanged",
    updatedProfile.bio,
    originalBio,
  );
  // 5. Verify the response has valid structure
  TestValidator.predicate(
    "id is valid UUID",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      updatedProfile.id,
    ),
  );
  TestValidator.predicate(
    "createdAt is valid ISO date",
    !isNaN(Date.parse(updatedProfile.createdAt)),
  );
}
