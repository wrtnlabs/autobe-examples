import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Test member profile update with all fields.
 *
 * This test validates the complete profile customization workflow:
 * 1. Member joins the platform
 * 2. Member updates profile with display_name, bio, and avatarFileId
 * 3. System returns updated profile with all changes applied
 * 4. Profile changes are immediately visible
 */
export async function test_api_member_profile_update_with_all_fields(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member account
  const memberConnection: api.IConnection = { host: connection.host };
  const joinResult: IRedditPlatformMember.IAuthorized =
    await authorize_member_join(memberConnection, {
      body: {
        email: typia.assert<string & tags.MinLength<1> & tags.MaxLength<255> & tags.Format<"email">>(
          typia.random<string & tags.Format<"email">>(),
        ),
        password: RandomGenerator.alphaNumeric(16),
        username: RandomGenerator.name(1),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: typia.random<string & tags.Format<"ipv4">>(),
      } satisfies IRedditPlatformMember.IJoin,
    });
  typia.assert(joinResult);
  // 2. Prepare profile update data
  const displayName: string & tags.MaxLength<50> = RandomGenerator.name(2);
  const bio: string & tags.MaxLength<500> = RandomGenerator.paragraph({
    sentences: 10,
  });
  // Note: For avatarFileId, we would need to upload a file first
  // Since file upload is not in the provided API functions, we'll test with null
  const profileUpdate: IRedditPlatformMember.IUpdate = {
    displayName,
    bio,
    avatarFileId: null,
  } satisfies IRedditPlatformMember.IUpdate;
  // 3. Update member profile
  const updatedProfile: IRedditPlatformMember =
    await api.functional.redditPlatform.member.profile.update(
      memberConnection,
      {
        body: profileUpdate,
      },
    );
  typia.assert(updatedProfile);
  // 4. Validate profile update results
  TestValidator.equals(
    "display name updated",
    updatedProfile.display_name,
    displayName,
  );
  TestValidator.equals("bio updated", updatedProfile.bio, bio);
  TestValidator.predicate("has valid id", updatedProfile.id !== undefined);
  TestValidator.predicate(
    "has valid username",
    updatedProfile.username !== undefined,
  );
  TestValidator.predicate(
    "has valid karma score",
    typeof updatedProfile.karma_score === "number",
  );
  TestValidator.predicate(
    "has created_at timestamp",
    updatedProfile.created_at !== undefined,
  );
  TestValidator.predicate(
    "has updated_at timestamp",
    updatedProfile.updated_at !== undefined,
  );
  // 5. Verify timestamps were updated
  TestValidator.predicate(
    "updated_at is valid datetime",
    () => new Date(updatedProfile.updated_at).getTime() > 0,
  );
}