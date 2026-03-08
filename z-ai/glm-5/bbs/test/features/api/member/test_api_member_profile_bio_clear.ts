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

export async function test_api_member_profile_bio_clear(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member-specific connection
  const memberConnection: api.IConnection = { host: connection.host };
  // 2. Register a member with initial bio using utility function
  const initialBio = RandomGenerator.paragraph({ sentences: 3 });
  const authorized = await authorize_member_join(memberConnection, {
    body: {
      displayName: RandomGenerator.name(),
      bio: initialBio,
    },
  });
  typia.assert(authorized);
  // Verify initial bio was set
  TestValidator.predicate(
    "initial bio is set",
    authorized.bio !== null && authorized.bio !== undefined,
  );
  // 3. Update profile to clear bio (set to null)
  const updatedProfile =
    await api.functional.discussionBoard.member.profile.update(
      memberConnection,
      {
        body: {
          displayName: authorized.displayName,
          bio: null,
        } satisfies IDiscussionBoardMember.IUpdate,
      },
    );
  typia.assert(updatedProfile);
  // 4. Verify bio is cleared (null)
  TestValidator.equals(
    "bio should be null after clearing",
    updatedProfile.bio,
    null,
  );
  // 5. Verify display name remains unchanged
  TestValidator.equals(
    "display name should remain unchanged",
    updatedProfile.displayName,
    authorized.displayName,
  );
}
