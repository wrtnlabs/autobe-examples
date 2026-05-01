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

/**
 * Verify that null clears optional profile fields while omitted fields retain their current values.
 *
 * Tests the partial-update semantics of the member profile endpoint. The profile has three fields — display_name, avatar_image, and phone_number — where avatar_image and phone_number are optional (nullable) and display_name is required when present. Setting optional fields to null should clear them in the database, while omitting a field from the request body should leave its existing value untouched.
 *
 * 1. Member joins and authenticates via authorize_member_join.
 * 2. First update: set display_name, avatar_image, and phone_number to known values.
 * 3. Second update: send avatar_image=null and phone_number=null, omitting display_name.
 * 4. Validate display_name is preserved, avatar_image is null, phone_number is null.
 */
export async function test_api_profile_clear_optional_fields(
  connection: api.IConnection,
): Promise<void> {
  // 1. Join as member
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {});
  // 2. First update — set all three profile fields to known values
  const firstDisplayName = RandomGenerator.name();
  const firstAvatar = typia.random<string & tags.Format<"uri">>();
  const firstPhone = RandomGenerator.mobile();
  const firstUpdate = await api.functional.erpHrm.member.profile.update(
    memberConnection,
    {
      body: {
        display_name: firstDisplayName,
        avatar_image: firstAvatar,
        phone_number: firstPhone,
      } satisfies IErpHrmMember.IUpdate,
    },
  );
  typia.assert(firstUpdate);
  // 3. Second update — clear optional fields, omit display_name
  const secondUpdate = await api.functional.erpHrm.member.profile.update(
    memberConnection,
    {
      body: {
        avatar_image: null,
        phone_number: null,
      } satisfies IErpHrmMember.IUpdate,
    },
  );
  typia.assert(secondUpdate);
  // 4. Validate partial-update semantics
  TestValidator.equals(
    "display_name preserved",
    secondUpdate.display_name,
    firstDisplayName,
  );
  TestValidator.equals("avatar_image cleared", secondUpdate.avatar_image, null);
  TestValidator.equals("phone_number cleared", secondUpdate.phone_number, null);
}
