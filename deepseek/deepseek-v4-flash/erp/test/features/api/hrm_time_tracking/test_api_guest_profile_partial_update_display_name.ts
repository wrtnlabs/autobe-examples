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

export async function test_api_guest_profile_partial_update_display_name(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new guest member with a known email and capture timestamps
  const email = typia.random<string & tags.Format<"email">>();
  const guestConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_guest_join(guestConnection, {
    body: { email },
  });
  typia.assert(authorized);
  // 2. Partial update: only provide display_name, omit avatar and phone_number
  const newDisplayName = "Alex Johnson";
  const updated = await api.functional.hrmTimeTracking.guest.profile.update(
    guestConnection,
    {
      body: {
        display_name: newDisplayName,
      } satisfies IHrmTimeTrackingMember.IUpdate,
    },
  );
  typia.assert(updated);
  // 3. Verify only display_name changed; other fields remain at defaults
  TestValidator.equals(
    "display name updated",
    updated.display_name,
    newDisplayName,
  );
  TestValidator.equals("email unchanged", updated.email, email);
  TestValidator.predicate("avatar remains null", updated.avatar === null);
  TestValidator.predicate(
    "phone_number remains null",
    updated.phone_number === null,
  );
  TestValidator.predicate(
    "updated_at advanced",
    new Date(updated.updated_at).getTime() >
      new Date(authorized.updated_at).getTime(),
  );
}
