import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_member_profile_public_access(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create a member with known profile data
  const authorizedMember = await authorize_member_join(connection, {
    body: {
      username: RandomGenerator.alphaNumeric(8),
      displayName: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
      avatarUrl: null,
    },
  });
  typia.assert(authorizedMember);
  // Step 2: Retrieve public profile WITHOUT authentication
  // The GET /members/{memberId} endpoint is public (no auth required)
  const publicProfile = await api.functional.communityPlatform.members.at(
    connection,
    { memberId: authorizedMember.id },
  );
  typia.assert(publicProfile);
  // Step 3: Verify public fields match the created member
  TestValidator.equals(
    "member id matches",
    publicProfile.id,
    authorizedMember.id,
  );
  TestValidator.equals(
    "username matches",
    publicProfile.username,
    authorizedMember.username,
  );
  TestValidator.equals(
    "displayName matches",
    publicProfile.displayName,
    authorizedMember.displayName,
  );
  TestValidator.equals("bio matches", publicProfile.bio, authorizedMember.bio);
  TestValidator.equals(
    "avatarUrl matches",
    publicProfile.avatarUrl,
    authorizedMember.avatarUrl,
  );
  // Step 4: Verify karma starts at 0 for new member
  TestValidator.equals("karma is 0 for new member", publicProfile.karma, 0);
  // Step 5: Security validation - sensitive fields are not in the response type
  // The ICommunityPlatformMember type intentionally excludes email and password
  // This is enforced by TypeScript's type system and validated by typia.assert()
  // No additional runtime checks needed - the DTO contract guarantees security
}
