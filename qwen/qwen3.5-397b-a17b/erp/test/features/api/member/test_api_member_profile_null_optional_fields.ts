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

export async function test_api_member_profile_null_optional_fields(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register member with optional fields explicitly set to null
  const memberConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_member_join(memberConnection, {
    body: {
      avatar_image: null,
      phone_number: null,
    },
  });
  typia.assert(authorized);
  // 2. Retrieve profile using the authenticated connection
  const profile =
    await api.functional.hrmPlatform.member.profile.at(memberConnection);
  typia.assert(profile);
  // 3. Verify optional fields are null
  TestValidator.equals("avatar_image is null", profile.avatar_image, null);
  TestValidator.equals("phone_number is null", profile.phone_number, null);
}
