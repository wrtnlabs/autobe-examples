import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmTimeTrackingDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingDepartment";
import type { IHrmTimeTrackingEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingEmployee";
import type { IHrmTimeTrackingGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingGuest";
import type { IHrmTimeTrackingGuestSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingGuestSession";
import type { IHrmTimeTrackingMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingMember";
import type { IHrmTimeTrackingMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingMemberSession";
import type { IHrmTimeTrackingOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingOrganization";
import type { IHrmTimeTrackingRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingRole";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_guest_join } from "../../../authorize/authorize_guest_join";
import { authorize_guest_refresh } from "../../../authorize/authorize_guest_refresh";

export async function test_api_guest_profile_clear_optional_fields(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new guest member and authenticate
  const guestConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_guest_join(guestConnection, {});
  typia.assert(authorized);
  // 2. First update: establish baseline with non-null avatar and phone_number
  const avatarUrl = typia.random<string & tags.Format<"uri">>();
  const phoneNumber = RandomGenerator.mobile();
  const initialDisplayName = RandomGenerator.name();
  const firstUpdate = await api.functional.hrmTimeTracking.guest.profile.update(
    guestConnection,
    {
      body: {
        display_name: initialDisplayName,
        avatar: avatarUrl,
        phone_number: phoneNumber,
      } satisfies IHrmTimeTrackingMember.IUpdate,
    },
  );
  typia.assert(firstUpdate);
  TestValidator.equals(
    "display_name after first update",
    firstUpdate.display_name,
    initialDisplayName,
  );
  TestValidator.equals(
    "avatar after first update",
    firstUpdate.avatar,
    avatarUrl,
  );
  TestValidator.equals(
    "phone_number after first update",
    firstUpdate.phone_number,
    phoneNumber,
  );
  // 3. Second update: explicitly clear avatar and phone_number to null, update display_name
  const newDisplayName = "Sam Rivera";
  const secondUpdate =
    await api.functional.hrmTimeTracking.guest.profile.update(guestConnection, {
      body: {
        display_name: newDisplayName,
        avatar: null,
        phone_number: null,
      } satisfies IHrmTimeTrackingMember.IUpdate,
    });
  typia.assert(secondUpdate);
  // 4. Validate the cleared fields
  TestValidator.equals(
    "display_name updated",
    secondUpdate.display_name,
    newDisplayName,
  );
  TestValidator.equals("avatar cleared to null", secondUpdate.avatar, null);
  TestValidator.equals(
    "phone_number cleared to null",
    secondUpdate.phone_number,
    null,
  );
  TestValidator.predicate("updated_at is recent", () => {
    const updatedAt = new Date(secondUpdate.updated_at).getTime();
    const now = Date.now();
    const fiveMinutes = 5 * 60 * 1000;
    return Math.abs(now - updatedAt) < fiveMinutes;
  });
}
