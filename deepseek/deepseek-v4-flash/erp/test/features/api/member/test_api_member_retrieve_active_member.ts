import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmTimeTrackingDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingDepartment";
import type { IHrmTimeTrackingEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingEmployee";
import type { IHrmTimeTrackingMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingMember";
import type { IHrmTimeTrackingMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingMemberSession";
import type { IHrmTimeTrackingOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingOrganization";
import type { IHrmTimeTrackingRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingRole";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_member_retrieve_active_member(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new member
  const memberConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(authorized);
  // 2. Extract member ID from join response
  const memberId = authorized.id;
  // 3. Retrieve the member's full profile (no auth required)
  const cleanConnection: api.IConnection = { host: connection.host };
  const member = await api.functional.hrmTimeTracking.members.at(
    cleanConnection,
    { memberId },
  );
  typia.assert(member);
  // 4. Business logic validation
  TestValidator.equals("id matches requested UUID", member.id, memberId);
  TestValidator.equals(
    "email matches registered email",
    member.email,
    authorized.email,
  );
  TestValidator.equals(
    "display_name matches registered display name",
    member.display_name,
    authorized.display_name,
  );
  TestValidator.predicate(
    "deleted_at is null for active member",
    member.deleted_at === null,
  );
  TestValidator.predicate(
    "employees is an array",
    Array.isArray(member.employees),
  );
  TestValidator.predicate(
    "sessions is an array",
    Array.isArray(member.sessions),
  );
  TestValidator.predicate(
    "ownedOrganizations is an array",
    Array.isArray(member.ownedOrganizations),
  );
}
