import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmsGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsGuest";
import type { IHrmsMemberProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsMemberProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_guest_join } from "../../../authorize/authorize_guest_join";
import { authorize_guest_refresh } from "../../../authorize/authorize_guest_refresh";

export async function test_api_guest_profile_update_phone_number(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Register a new guest account
  const guestAuth = await authorize_guest_join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IHrmsGuest.IJoin,
  });
  typia.assert(guestAuth);
  // Step 2: Create guest connection with authorization token
  const guestConnection: api.IConnection = { host: connection.host };
  guestConnection.headers = {
    Authorization: guestAuth.token.access,
  };
  // Step 3: Update guest profile with phone number
  const phoneNumber = "+12125551234";
  const updateBody = {
    phone: phoneNumber,
  } satisfies IHrmsMemberProfile.IUpdate;
  const updatedProfile = await api.functional.hrms.guest.profile.update(
    guestConnection,
    {
      body: updateBody,
    },
  );
  typia.assert(updatedProfile);
  // Step 4: Verify phone number matches input
  TestValidator.equals(
    "phone number matches input",
    updatedProfile.phone_number,
    phoneNumber,
  );
  // Step 5: Verify avatar_uri is null (no avatar set)
  TestValidator.equals("avatar_uri is null", updatedProfile.avatar_uri, null);
  // Step 6: Verify display_name is not null/empty
  TestValidator.predicate(
    "display_name is set and not empty",
    updatedProfile.display_name.length > 0,
  );
  // Step 7: Verify updated_at is valid date-time
  TestValidator.predicate(
    "updated_at is valid date-time",
    () => !Number.isNaN(Date.parse(updatedProfile.updated_at)),
  );
}
