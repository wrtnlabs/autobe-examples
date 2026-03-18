import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
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
  // 1. Authenticate as member using utility function
  const memberConnection: api.IConnection = { host: connection.host };
  const authResult = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      avatar_url: typia.random<(string & tags.Format<"uri">) | null>(),
      phone_number: RandomGenerator.mobile(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<(string & tags.Format<"ipv4">) | null>(),
    } satisfies IHrmPlatformMember.IJoin,
  });
  typia.assert(authResult);
  // 2. Store initial profile values for comparison
  const initialAvatarUrl = authResult.avatarUrl;
  const initialPhoneNumber = authResult.phoneNumber;
  const initialUpdatedAt = authResult.updatedAt;
  // 3. Generate new display name for update
  const newDisplayName = RandomGenerator.name();
  // 4. Update profile with only display_name (partial update)
  const updatedProfile = await api.functional.hrmPlatform.member.profile.update(
    memberConnection,
    {
      body: {
        display_name: newDisplayName,
      } satisfies IHrmPlatformMember.IUpdate,
    },
  );
  typia.assert(updatedProfile);
  // 5. Validate display_name was updated
  TestValidator.equals(
    "display_name updated",
    updatedProfile.displayName,
    newDisplayName,
  );
  // 6. Validate avatar_url remains unchanged
  TestValidator.equals(
    "avatar_url unchanged",
    updatedProfile.avatarUrl,
    initialAvatarUrl,
  );
  // 7. Validate phone_number remains unchanged
  TestValidator.equals(
    "phone_number unchanged",
    updatedProfile.phoneNumber,
    initialPhoneNumber,
  );
  // 8. Validate updated_at timestamp was modified
  TestValidator.predicate(
    "updated_at changed",
    updatedProfile.updatedAt > initialUpdatedAt,
  );
}
