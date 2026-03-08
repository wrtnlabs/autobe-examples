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
 * Test member profile update with display name and bio.
 *
 * This test verifies the primary success path for member profile update operation:
 * 1. Member joins the discussion board platform
 * 2. Member updates their profile with new display name and bio
 * 3. System validates and persists the changes
 * 4. Response contains updated member profile with all fields
 * 5. updated_at timestamp is refreshed
 */
export async function test_api_member_profile_update_with_display_name_and_bio(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member joins the platform
  const memberConnection: api.IConnection = { host: connection.host };
  const joinResult = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(1),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IDiscussionBoardMember.IJoin,
  });
  typia.assert(joinResult);
  // Store original values for comparison
  const originalDisplayName = joinResult.displayName;
  const originalBio = joinResult.bio;
  const originalUpdatedAt = joinResult.updatedAt;
  // 2. Update profile with new display name and bio
  const newDisplayName = RandomGenerator.name(2);
  const newBio = RandomGenerator.paragraph({ sentences: 5 });
  const updateBody = {
    displayName: newDisplayName,
    bio: newBio,
  } satisfies IDiscussionBoardMember.IUpdate;
  const updatedProfile =
    await api.functional.discussionBoard.member.profile.update(
      memberConnection,
      {
        body: updateBody,
      },
    );
  typia.assert(updatedProfile);
  // 3. Verify response contains correct updated values
  TestValidator.equals(
    "display name updated",
    updatedProfile.displayName,
    newDisplayName,
  );
  TestValidator.equals("bio updated", updatedProfile.bio, newBio);
  TestValidator.equals(
    "email preserved",
    updatedProfile.email,
    joinResult.email,
  );
  TestValidator.equals("id preserved", updatedProfile.id, joinResult.id);
  TestValidator.equals("ban status active", updatedProfile.banStatus, "active");
  // 4. Verify updated_at timestamp is refreshed
  TestValidator.predicate(
    "updated_at is refreshed",
    new Date(updatedProfile.updatedAt) > new Date(originalUpdatedAt),
  );
  // 5. Verify other immutable fields remain unchanged
  TestValidator.equals(
    "createdAt unchanged",
    updatedProfile.createdAt,
    joinResult.createdAt,
  );
}
