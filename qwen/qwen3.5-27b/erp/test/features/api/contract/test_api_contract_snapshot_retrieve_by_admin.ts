import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformAdmin";
import type { IHrmPlatformContract } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformContract";
import type { IHrmPlatformContractSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformContractSnapshot";
import type { IHrmPlatformDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformDepartment";
import type { IHrmPlatformEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformEmployee";
import type { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import type { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
import type { IHrmPlatformOrganizationLogo } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganizationLogo";
import type { IHrmPlatformOrganizationSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganizationSetting";
import type { IHrmPlatformRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformRole";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { generate_random_hrm_platform_contracts_create } from "../../../generate/generate_random_hrm_platform_contracts_create";
import { prepare_random_hrm_platform_contract } from "../../../prepare/prepare_random_hrm_platform_contract";

/**
 * Test that an admin can successfully retrieve any contract snapshot within their organization.
 *
 * This test validates that administrators have elevated permissions to access
 * contract snapshots belonging to any employee in their organization, not just
 * their own contracts. It verifies the complete snapshot structure including
 * all contract terms and related entity references.
 */
export async function test_api_contract_snapshot_retrieve_by_admin(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin authentication setup
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & typia.tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & typia.tags.Format<"uri">>(),
      referrer: typia.random<string & typia.tags.Format<"uri">>(),
    },
  });
  // 2. Create a contract for an employee using utility function
  const contract: IHrmPlatformContract =
    await generate_random_hrm_platform_contracts_create(adminConnection, {
      body: {
        employee_id: typia.random<string & typia.tags.Format<"uuid">>(),
        start_at: new Date().toISOString(),
        pay_rate: typia.random<
          number & typia.tags.Type<"uint32"> & typia.tags.Minimum<1000000>
        >(),
        pay_period: RandomGenerator.pick([
          "hourly",
          "daily",
          "weekly",
          "monthly",
        ] as const),
        working_hours_per_week: typia.random<
          number &
            typia.tags.Type<"uint32"> &
            typia.tags.Minimum<20> &
            typia.tags.Maximum<60>
        >(),
      },
    });
  typia.assert(contract);
  // 3. Generate a snapshotId for testing
  // Note: In a real scenario, snapshots would be created through a separate process.
  // For this test, we use a simulated snapshotId to test the retrieval endpoint.
  const snapshotId: string & typia.tags.Format<"uuid"> = typia.random<
    string & typia.tags.Format<"uuid">
  >();
  // 4. Retrieve the contract snapshot as admin
  const snapshot: IHrmPlatformContractSnapshot =
    await api.functional.hrmPlatform.contracts.snapshots.at(adminConnection, {
      contractId: contract.id,
      snapshotId: snapshotId,
    });
  typia.assert(snapshot);
  // 5. Validate snapshot structure and content
  TestValidator.equals(
    "snapshot belongs to correct contract",
    snapshot.contract.id,
    contract.id,
  );
  TestValidator.equals(
    "employee ID matches",
    snapshot.employee.id,
    contract.employee.id,
  );
  TestValidator.equals(
    "organization ID matches",
    snapshot.organization.id,
    contract.organization.id,
  );
  // 6. Verify contract terms are preserved in snapshot
  TestValidator.equals(
    "start_at preserved",
    snapshot.start_at,
    contract.start_at,
  );
  TestValidator.equals(
    "pay_rate preserved",
    snapshot.pay_rate,
    contract.pay_rate,
  );
  TestValidator.equals(
    "pay_period preserved",
    snapshot.pay_period,
    contract.pay_period,
  );
  TestValidator.equals(
    "working_hours_per_week preserved",
    snapshot.working_hours_per_week,
    contract.working_hours_per_week,
  );
  // 7. Verify snapshot has valid created_at timestamp
  TestValidator.predicate(
    "snapshot has created_at timestamp",
    snapshot.created_at != null,
  );
  TestValidator.predicate(
    "created_at is valid datetime",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:\d{2})$/.test(
      snapshot.created_at,
    ),
  );
  // 8. Verify end_at handling (can be null for ongoing contracts)
  if (contract.end_at != null) {
    TestValidator.equals(
      "end_at preserved for fixed-term contract",
      snapshot.end_at,
      contract.end_at,
    );
  } else {
    TestValidator.equals(
      "end_at is null for ongoing contract",
      snapshot.end_at,
      null,
    );
  }
  // 9. Verify related entities are properly joined
  TestValidator.predicate(
    "employee has valid member reference",
    snapshot.employee.member != null,
  );
  TestValidator.predicate(
    "employee member has email",
    snapshot.employee.member.email != null,
  );
  TestValidator.predicate(
    "employee has valid role",
    snapshot.employee.role != null,
  );
  TestValidator.predicate(
    "organization has valid setting",
    snapshot.organization.setting != null,
  );
  TestValidator.predicate(
    "organization has valid logo",
    snapshot.organization.logo != null,
  );
  TestValidator.predicate(
    "organization setting has currency",
    snapshot.organization.setting.currency != null,
  );
  TestValidator.predicate(
    "organization setting has timezone",
    snapshot.organization.setting.timezone != null,
  );
}
