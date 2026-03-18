import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmTimeTrackingMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingMember";
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
import { generate_random_hrm_time_tracking_member_roles_create } from "../../../generate/generate_random_hrm_time_tracking_member_roles_create";
import { prepare_random_hrm_time_tracking_role } from "../../../prepare/prepare_random_hrm_time_tracking_role";

export async function test_api_role_create_duplicate_or_reserved_name_rejected(
  connection: api.IConnection,
): Promise<void> {
  const memberConnection: api.IConnection = { host: connection.host };
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = RandomGenerator.alphaNumeric(16);
  await authorize_member_join(memberConnection, {
    body: {
      email: memberEmail,
      password: memberPassword,
    } satisfies IHrmTimeTrackingMember.IJoin,
  });
  const roleName = `Role ${RandomGenerator.name(2)}`;
  const roleCode = RandomGenerator.alphabets(8);
  const createdRole = await api.functional.hrmTimeTracking.member.roles.create(
    memberConnection,
    {
      body: {
        name: roleName,
        code: roleCode,
        description: RandomGenerator.paragraph({ sentences: 2 }),
        sortOrder: typia.random<number & tags.Type<"int32">>(),
      } satisfies IHrmTimeTrackingRole.ICreate,
    },
  );
  typia.assert(createdRole);
  TestValidator.equals("created role name", createdRole.name, roleName);
  TestValidator.equals("created role code", createdRole.code, roleCode);
  TestValidator.predicate(
    "created role belongs to the active organization context",
    createdRole.organization.id.length > 0,
  );
  await TestValidator.error(
    "duplicate role name should be rejected",
    async () => {
      await api.functional.hrmTimeTracking.member.roles.create(
        memberConnection,
        {
          body: {
            name: roleName,
            code: `${roleCode}_dup`,
            description: RandomGenerator.paragraph({ sentences: 2 }),
            sortOrder: typia.random<number & tags.Type<"int32">>(),
          } satisfies IHrmTimeTrackingRole.ICreate,
        },
      );
    },
  );
  await TestValidator.error(
    "duplicate role code should be rejected",
    async () => {
      await api.functional.hrmTimeTracking.member.roles.create(
        memberConnection,
        {
          body: {
            name: `${roleName} Duplicate`,
            code: roleCode,
            description: RandomGenerator.paragraph({ sentences: 2 }),
            sortOrder: typia.random<number & tags.Type<"int32">>(),
          } satisfies IHrmTimeTrackingRole.ICreate,
        },
      );
    },
  );
  const reservedName = RandomGenerator.pick([
    "Owner",
    "Manager",
    "Employee",
  ] as const);
  await TestValidator.error(
    "reserved built-in role should be rejected",
    async () => {
      await api.functional.hrmTimeTracking.member.roles.create(
        memberConnection,
        {
          body: {
            name: reservedName,
            description: "System protected role",
            sortOrder: typia.random<number & tags.Type<"int32">>(),
          } satisfies IHrmTimeTrackingRole.ICreate,
        },
      );
    },
  );
}
