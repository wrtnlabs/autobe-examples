import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformProfile";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_profile_clear_optional_fields(
  connection: api.IConnection,
): Promise<void> {
  // 1. Join as a new member
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {});
  // 2. Set initial profile with all optional fields populated
  const firstProfile =
    await api.functional.communityPlatform.member.profile.update(
      memberConnection,
      {
        body: {
          display_name: "Test User",
          biography: "Some initial biography",
          avatar_uri: "https://example.com/avatar.png",
        } satisfies ICommunityPlatformProfile.IUpdate,
      },
    );
  typia.assert(firstProfile);
  // 3. Verify initial profile fields
  TestValidator.equals(
    "display_name is set",
    firstProfile.display_name,
    "Test User",
  );
  TestValidator.equals(
    "biography is set",
    firstProfile.biography,
    "Some initial biography",
  );
  TestValidator.equals(
    "avatar_uri is set",
    firstProfile.avatar_uri,
    "https://example.com/avatar.png",
  );
  TestValidator.equals("karma is 0", firstProfile.karma, 0);
  const firstUpdatedAt: number = new Date(firstProfile.updated_at).getTime();
  // 4. Clear optional fields by setting them to null
  const secondProfile =
    await api.functional.communityPlatform.member.profile.update(
      memberConnection,
      {
        body: {
          display_name: "Test User",
          biography: null,
          avatar_uri: null,
        } satisfies ICommunityPlatformProfile.IUpdate,
      },
    );
  typia.assert(secondProfile);
  // 5. Verify optional fields are cleared
  TestValidator.equals(
    "biography is null after clear",
    secondProfile.biography,
    null,
  );
  TestValidator.equals(
    "avatar_uri is null after clear",
    secondProfile.avatar_uri,
    null,
  );
  // 6. Verify display_name is preserved
  TestValidator.equals(
    "display_name unchanged",
    secondProfile.display_name,
    "Test User",
  );
  // 7. Verify karma is still 0 (system-managed)
  TestValidator.equals("karma remains 0", secondProfile.karma, 0);
  // 8. Verify updated_at advanced
  const secondUpdatedAt: number = new Date(secondProfile.updated_at).getTime();
  TestValidator.predicate(
    "updated_at is newer after clearing fields",
    secondUpdatedAt > firstUpdatedAt,
  );
}
