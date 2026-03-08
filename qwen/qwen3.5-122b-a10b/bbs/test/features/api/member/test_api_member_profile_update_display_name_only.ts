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

/**
 * Test partial profile update with only display name modification.
 * A logged-in member updates their display name while keeping the existing bio unchanged.
 */
export async function test_api_member_profile_update_display_name_only(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member account with initial bio
  const originalBio = RandomGenerator.paragraph({ sentences: 3 });
  const joinResult = await authorize_member_join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(1),
      bio: originalBio,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IDiscussionBoardMember.IJoin,
  });
  typia.assert(joinResult);
  // 2. Create member-specific connection
  const memberConnection: api.IConnection = { host: connection.host };
  memberConnection.headers = { Authorization: joinResult.token.access };
  // 3. Capture original profile state
  const originalDisplayName = joinResult.displayName;
  const originalUpdatedAt = joinResult.updatedAt;
  // 4. Update only displayName (not bio)
  const newDisplayName = RandomGenerator.name(2);
  const updateBody = {
    displayName: newDisplayName,
  } satisfies IDiscussionBoardMember.IUpdate;
  const updatedProfile =
    await api.functional.discussionBoard.member.profile.update(
      memberConnection,
      {
        body: updateBody,
      },
    );
  typia.assert(updatedProfile);
  // 5. Validate display name was updated
  TestValidator.equals(
    "display name updated",
    updatedProfile.displayName,
    newDisplayName,
  );
  TestValidator.notEquals(
    "display name differs from original",
    updatedProfile.displayName,
    originalDisplayName,
  );
  // 6. Validate bio was preserved
  TestValidator.equals("bio unchanged", updatedProfile.bio, originalBio);
  // 7. Validate updated_at was refreshed
  TestValidator.notEquals(
    "updated_at refreshed",
    updatedProfile.updatedAt,
    originalUpdatedAt,
  );
  // 8. Validate other fields remain unchanged
  TestValidator.equals("id unchanged", updatedProfile.id, joinResult.id);
  TestValidator.equals(
    "email unchanged",
    updatedProfile.email,
    joinResult.email,
  );
  TestValidator.equals(
    "ban status unchanged",
    updatedProfile.banStatus,
    joinResult.banStatus,
  );
}
