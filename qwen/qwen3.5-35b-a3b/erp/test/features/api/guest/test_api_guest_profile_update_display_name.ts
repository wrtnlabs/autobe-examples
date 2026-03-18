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

export async function test_api_guest_profile_update_display_name(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Register a new guest account
  const joinConnection: api.IConnection = { host: connection.host };
  const email = typia.random<string & tags.Format<"email">>();
  const href = typia.random<string & tags.Format<"uri">>();
  const referrer = typia.random<string & tags.Format<"uri">>();
  const joined = await authorize_guest_join(joinConnection, {
    body: {
      email,
      href,
      referrer,
    } satisfies IHrmsGuest.IJoin,
  });
  typia.assert(joined);
  // Step 2: Create authenticated connection using access token from registration
  const guestConnection: api.IConnection = { host: connection.host };
  guestConnection.headers = { Authorization: joined.token.access };
  // Step 3: Update guest profile with new display name
  const newDisplayName = "John Doe";
  const updatedProfile = await api.functional.hrms.guest.profile.update(
    guestConnection,
    {
      body: {
        displayName: newDisplayName,
      } satisfies IHrmsMemberProfile.IUpdate,
    },
  );
  typia.assert(updatedProfile);
  // Step 4: Verify response contains updated profile with new display name
  TestValidator.equals(
    "display name matches submitted value",
    updatedProfile.display_name,
    newDisplayName,
  );
  // Step 5: Verify email remains unchanged from registration
  TestValidator.equals("email remains unchanged", updatedProfile.email, email);
  // Step 6: Verify avatar_uri is null (not set during registration)
  TestValidator.equals("avatar_uri is null", updatedProfile.avatar_uri, null);
  // Step 7: Verify phone_number is null (not set during registration)
  TestValidator.equals(
    "phone_number is null",
    updatedProfile.phone_number,
    null,
  );
  // Step 8: Verify created_at timestamp exists and is valid date-time format
  const createdDate = new Date(updatedProfile.created_at);
  TestValidator.predicate(
    "created_at is valid date",
    createdDate instanceof Date && !isNaN(createdDate.getTime()),
  );
  // Step 9: Verify updated_at timestamp exists and is valid date-time format
  const updatedDate = new Date(updatedProfile.updated_at);
  TestValidator.predicate(
    "updated_at is valid date",
    updatedDate instanceof Date && !isNaN(updatedDate.getTime()),
  );
  // Step 10: Verify updated_at is at least as recent as created_at
  TestValidator.predicate(
    "updated_at >= created_at",
    updatedDate.getTime() >= createdDate.getTime(),
  );
  // Step 11: Verify deleted_at is null (guest is active)
  TestValidator.equals("deleted_at is null", updatedProfile.deleted_at, null);
}
