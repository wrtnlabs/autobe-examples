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

export async function test_api_guest_profile_full_update(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate as a guest member
  const guestConnection: api.IConnection = { host: connection.host };
  const joinInput: IHrmTimeTrackingGuest.IJoin = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
    ip: typia.random<string & tags.Format<"ipv4">>(),
  };
  const authorized: IHrmTimeTrackingGuest.IAuthorized =
    await authorize_guest_join(guestConnection, { body: joinInput });
  typia.assert(authorized);
  // 2. Update all global profile fields
  const displayName: string = RandomGenerator.name();
  const avatar: string & tags.Format<"uri"> = typia.random<
    string & tags.Format<"uri">
  >();
  const phoneNumber: string = RandomGenerator.mobile();
  const member: IHrmTimeTrackingMember =
    await api.functional.hrmTimeTracking.guest.profile.update(guestConnection, {
      body: {
        display_name: displayName,
        avatar,
        phone_number: phoneNumber,
      } satisfies IHrmTimeTrackingMember.IUpdate,
    });
  typia.assert(member);
  // 3. Business logic validation
  TestValidator.equals("display name", member.display_name, displayName);
  TestValidator.equals("avatar", member.avatar, avatar);
  TestValidator.equals("phone number", member.phone_number, phoneNumber);
  TestValidator.predicate("deleted_at is null", member.deleted_at === null);
  TestValidator.equals("email unchanged", member.email, joinInput.email);
  TestValidator.predicate(
    "updated_at after created_at",
    new Date(member.updated_at).getTime() >
      new Date(member.created_at).getTime(),
  );
}
