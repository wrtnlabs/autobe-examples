import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmGuest";
import type { IErpHrmGuestSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmGuestSession";
import type { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_profile_update_clear_optional_fields(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Register a new member and get JWT token
  const memberConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(authorized);
  // Step 2: Perform initial profile update with non-null avatarUrl and phoneNumber
  const initialProfile = await api.functional.erpHrm.member.profile.update(
    memberConnection,
    {
      body: {
        displayName: "Bob Builder Initial",
        avatarUrl: typia.random<string & tags.Format<"uri">>(),
        phoneNumber: RandomGenerator.mobile(),
      } satisfies IErpHrmGuestSession.IUpdate,
    },
  );
  typia.assert(initialProfile);
  // Step 3: Main test - clear optional fields by setting them to null
  const updatedProfile = await api.functional.erpHrm.member.profile.update(
    memberConnection,
    {
      body: {
        displayName: "Bob Builder",
        avatarUrl: null,
        phoneNumber: null,
      } satisfies IErpHrmGuestSession.IUpdate,
    },
  );
  typia.assert(updatedProfile);
}
