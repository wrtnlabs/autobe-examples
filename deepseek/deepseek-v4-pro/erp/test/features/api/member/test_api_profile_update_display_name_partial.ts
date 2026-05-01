import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import type { IErpHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganization";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_profile_update_display_name_partial(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member connection and register
  const memberConnection: api.IConnection = { host: connection.host };
  const joinResponse = await authorize_member_join(memberConnection, {});
  typia.assert(joinResponse);
  // 2. Capture original profile values
  const originalAvatarImage = joinResponse.avatar_image;
  const originalPhoneNumber = joinResponse.phone_number;
  // 3. Generate a new display name distinct from the original
  const newDisplayName = RandomGenerator.name();
  // 4. Update only the display_name field
  const updatedProfile = await api.functional.erpHrm.member.profile.update(
    memberConnection,
    {
      body: {
        display_name: newDisplayName,
      } satisfies IErpHrmMember.IUpdate,
    },
  );
  typia.assert(updatedProfile);
  // 5. Validate partial update semantics
  TestValidator.equals(
    "display_name updated",
    updatedProfile.display_name,
    newDisplayName,
  );
  TestValidator.equals(
    "avatar_image unchanged",
    updatedProfile.avatar_image,
    originalAvatarImage,
  );
  TestValidator.equals(
    "phone_number unchanged",
    updatedProfile.phone_number,
    originalPhoneNumber,
  );
}
