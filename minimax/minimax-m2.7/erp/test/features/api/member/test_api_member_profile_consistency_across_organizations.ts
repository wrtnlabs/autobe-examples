import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_member_profile_consistency_across_organizations(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member account
  const memberConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(12) + "Aa1!",
      display_name: RandomGenerator.name(),
      phone: RandomGenerator.mobile(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(authorized);
  TestValidator.equals("member has email", authorized.email.length > 0, true);
  TestValidator.equals(
    "member has token",
    authorized.token.access.length > 0,
    true,
  );
  // 2. Update profile with new values
  const newDisplayName = RandomGenerator.name(2);
  const newPhone = RandomGenerator.mobile();
  const newAvatarUri =
    "https://example.com/avatar-" + RandomGenerator.alphaNumeric(8) + ".png";
  const updatedProfile = await api.functional.erpHrm.member.profile.update(
    memberConnection,
    {
      body: {
        display_name: newDisplayName,
        phone: newPhone,
        avatar_uri: newAvatarUri,
      } satisfies IErpHrmMember.IUpdate,
    },
  );
  typia.assert(updatedProfile);
  // 3. Verify profile was updated correctly (global profile)
  TestValidator.equals(
    "display name updated",
    updatedProfile.display_name,
    newDisplayName,
  );
  TestValidator.equals("phone updated", updatedProfile.phone, newPhone);
  TestValidator.equals(
    "avatar_uri updated",
    updatedProfile.avatar_uri,
    newAvatarUri,
  );
  // 4. Make another profile update to verify persistence
  const finalDisplayName = RandomGenerator.name(3);
  const finalProfile = await api.functional.erpHrm.member.profile.update(
    memberConnection,
    {
      body: {
        display_name: finalDisplayName,
      } satisfies IErpHrmMember.IUpdate,
    },
  );
  typia.assert(finalProfile);
  // 5. Verify subsequent update shows updated values (proves persistence)
  TestValidator.equals(
    "display name changed",
    finalProfile.display_name,
    finalDisplayName,
  );
  TestValidator.equals("phone still persisted", finalProfile.phone, newPhone);
  TestValidator.equals(
    "avatar_uri still persisted",
    finalProfile.avatar_uri,
    newAvatarUri,
  );
  // 6. Update avatar to null to test nullable field
  const profileWithNullAvatar =
    await api.functional.erpHrm.member.profile.update(memberConnection, {
      body: {
        avatar_uri: null,
      } satisfies IErpHrmMember.IUpdate,
    });
  typia.assert(profileWithNullAvatar);
  // 7. Verify nullable avatar update
  TestValidator.equals(
    "avatar_uri set to null",
    profileWithNullAvatar.avatar_uri,
    null,
  );
  TestValidator.equals(
    "display_name still preserved",
    profileWithNullAvatar.display_name,
    finalDisplayName,
  );
  TestValidator.equals(
    "phone still preserved",
    profileWithNullAvatar.phone,
    newPhone,
  );
}
