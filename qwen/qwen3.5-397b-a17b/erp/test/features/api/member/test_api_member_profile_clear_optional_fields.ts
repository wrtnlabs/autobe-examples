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

export async function test_api_member_profile_clear_optional_fields(
  connection: api.IConnection,
): Promise<void> {
  // 1. Join as a new member with avatar_url and phone_number initially set
  const memberConnection: api.IConnection = { host: connection.host };
  const joinResult = await authorize_member_join(memberConnection, {
    body: {
      avatar_url: typia.random<string & tags.Format<"uri">>(),
      phone_number: RandomGenerator.mobile(),
    },
  });
  typia.assert(joinResult);
  // Verify initial profile has avatar_url and phone_number set
  TestValidator.predicate(
    "avatar_url initially set",
    joinResult.avatarUrl !== null,
  );
  TestValidator.predicate(
    "phone_number initially set",
    joinResult.phoneNumber !== null,
  );
  // 2. Update profile by setting avatar_url and phone_number to null
  const updateBody = {
    display_name: RandomGenerator.name(),
    avatar_url: null,
    phone_number: null,
  } satisfies IHrmPlatformMember.IUpdate;
  const updatedProfile = await api.functional.hrmPlatform.member.profile.update(
    memberConnection,
    {
      body: updateBody,
    },
  );
  typia.assert(updatedProfile);
  // 3. Verify both optional fields are now null
  TestValidator.equals("avatar_url cleared", updatedProfile.avatarUrl, null);
  TestValidator.equals(
    "phone_number cleared",
    updatedProfile.phoneNumber,
    null,
  );
  // 4. Verify display_name was updated
  TestValidator.equals(
    "display_name updated",
    updatedProfile.displayName,
    updateBody.display_name,
  );
  // 5. Verify updated_at timestamp is refreshed (should be after join timestamp)
  TestValidator.predicate(
    "updated_at refreshed",
    new Date(updatedProfile.updatedAt) >= new Date(joinResult.updatedAt),
  );
}
