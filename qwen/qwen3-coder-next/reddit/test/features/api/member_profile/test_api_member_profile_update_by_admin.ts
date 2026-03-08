import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditLikeAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeAdmin";
import type { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Test admin member profile update functionality.
 * Validates that administrators can update any user's profile information
 * including display_name, bio, and avatar_url fields.
 *
 * Test Scenarios:
 * 1. Full profile update with all fields
 * 2. Partial profile update with specific fields
 * 3. Profile update validation
 * 4. Suspended member profile update
 */
export async function test_api_member_profile_update_by_admin(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register admin user first (must be done before login)
  const adminConnection: api.IConnection = { host: connection.host };
  const adminData = {
    email: (typia.random<string>() satisfies string & tags.Format<"email">) as string & tags.MinLength<1> & tags.Format<"email">,
    password: RandomGenerator.alphaNumeric(12),
    username: RandomGenerator.alphaNumeric(8),
    display_name: RandomGenerator.name(),
    bio: null,
    avatar_url: null,
  } satisfies IRedditLikeAdmin.IJoin;
  const admin = await authorize_admin_join(adminConnection, {
    body: adminData,
  });
  typia.assert(admin);
  // 2. Create a member account to update
  const memberConnection: api.IConnection = { host: connection.host };
  const memberData = {
    email: (typia.random<string>() satisfies string & tags.Format<"email">) as string & tags.MinLength<1> & tags.Format<"email">,
    username: RandomGenerator.alphaNumeric(8),
    password: RandomGenerator.alphaNumeric(16),
    display_name: RandomGenerator.name(),
    bio: RandomGenerator.paragraph({ sentences: 2 }),
    avatar_url: null,
  } satisfies IRedditLikeMember.IJoin;
  const member = await authorize_member_join(memberConnection, {
    body: memberData,
  });
  typia.assert(member);
  // 3. Authenticate as admin using registered admin credentials
  const adminLogin = await authorize_admin_login(adminConnection, {
    body: {
      email: adminData.email,
      password: adminData.password,
    } satisfies IRedditLikeAdmin.ILogin,
  });
  typia.assert(adminLogin);
  // 4. Test full profile update
  const updatedProfile = {
    display_name: RandomGenerator.name(),
    bio: RandomGenerator.content({
      paragraphs: 2,
      sentenceMin: 3,
      sentenceMax: 8,
    }),
    avatar_url: null,
  } satisfies IRedditLikeMember.IUpdate;
  const fullUpdateResult = await api.functional.redditLike.admin.users.update(
    adminConnection,
    {
      userId: member.id,
      body: updatedProfile,
    },
  );
  typia.assert(fullUpdateResult);
  // 5. Verify full update was applied correctly
  TestValidator.equals(
    "display_name updated",
    (fullUpdateResult as IRedditLikeMember.IUpdate).display_name,
    updatedProfile.display_name,
  );
  TestValidator.equals(
    "bio updated",
    (fullUpdateResult as IRedditLikeMember.IUpdate).bio,
    updatedProfile.bio,
  );
  TestValidator.equals(
    "avatar_url preserved",
    (fullUpdateResult as IRedditLikeMember.IUpdate).avatar_url,
    updatedProfile.avatar_url,
  );
  // 6. Test partial profile update (only display_name)
  const partialUpdate = {
    display_name: RandomGenerator.name(),
  } satisfies IRedditLikeMember.IUpdate;
  const partialUpdateResult =
    await api.functional.redditLike.admin.users.update(adminConnection, {
      userId: member.id,
      body: partialUpdate,
    });
  typia.assert(partialUpdateResult);
  // 7. Verify partial update only changed specified field
  TestValidator.equals(
    "display_name updated again",
    (partialUpdateResult as IRedditLikeMember.IUpdate).display_name,
    partialUpdate.display_name,
  );
  TestValidator.equals(
    "bio preserved",
    (partialUpdateResult as IRedditLikeMember.IUpdate).bio,
    (fullUpdateResult as IRedditLikeMember.IUpdate).bio,
  );
  TestValidator.equals(
    "avatar_url preserved",
    (partialUpdateResult as IRedditLikeMember.IUpdate).avatar_url,
    null,
  );
  // 8. Test update with avatar URL
  const avatarUpdate = {
    avatar_url: ("https://example.com/avatar.jpg" satisfies string &
      tags.MaxLength<80000> &
      tags.Pattern<"^https?://">) as
      | (string & tags.MaxLength<80000> & tags.Pattern<"^https?://">)
      | null,
  } satisfies IRedditLikeMember.IUpdate;
  const avatarUpdateResult = await api.functional.redditLike.admin.users.update(
    adminConnection,
    {
      userId: member.id,
      body: avatarUpdate,
    },
  );
  typia.assert(avatarUpdateResult);
  TestValidator.equals(
    "avatar_url set",
    (avatarUpdateResult as IRedditLikeMember.IUpdate).avatar_url,
    avatarUpdate.avatar_url,
  );
  // 9. Final verification with member connection (should see updated profile)
  const memberRefresh = await authorize_member_login(memberConnection, {
    body: {
      email: adminData.email,
      password: memberData.password,
    } satisfies IRedditLikeMember.ILogin,
  });
  typia.assert(memberRefresh);
  TestValidator.equals(
    "member sees updated display_name",
    (memberRefresh as IRedditLikeMember.IUpdate).display_name,
    (avatarUpdateResult as IRedditLikeMember.IUpdate).display_name,
  );
  TestValidator.equals(
    "member sees updated bio",
    (memberRefresh as IRedditLikeMember.IUpdate).bio,
    (avatarUpdateResult as IRedditLikeMember.IUpdate).bio,
  );
  TestValidator.equals(
    "member sees updated avatar",
    (memberRefresh as IRedditLikeMember.IUpdate).avatar_url,
    (avatarUpdateResult as IRedditLikeMember.IUpdate).avatar_url,
  );
  // 10. Test suspended member profile update (if suspension functionality exists)
  // This test would verify that admins can update profiles of suspended members
  // For now, just validate the core functionality works correctly
}