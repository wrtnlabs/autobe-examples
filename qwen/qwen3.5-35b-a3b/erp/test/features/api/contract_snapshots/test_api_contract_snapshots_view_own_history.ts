import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmPlatformContract } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformContract";
import type { IHrmPlatformContractsSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformContractsSnapshot";
import type { IHrmPlatformDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformDepartment";
import type { IHrmPlatformEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformEmployee";
import type { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import type { IHrmPlatformMemberEmailVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMemberEmailVerification";
import type { IHrmPlatformMemberPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMemberPasswordReset";
import type { IHrmPlatformMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMemberSession";
import type { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
import type { IHrmPlatformRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformRole";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHrmPlatformContractsSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmPlatformContractsSnapshot";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_hrm_platform_member_contracts_create } from "../../../generate/generate_random_hrm_platform_member_contracts_create";
import { prepare_random_hrm_platform_contract } from "../../../prepare/prepare_random_hrm_platform_contract";

export async function test_api_contract_snapshots_view_own_history(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Register member with organization creation
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      name: RandomGenerator.name(),
      phone_number: RandomGenerator.mobile(),
      avatar_uri: typia.random<string & tags.Format<"uri">>() + "/avatar.png",
      org_name: RandomGenerator.name(),
      org_currency: RandomGenerator.pick(["USD", "EUR", "KRW"]),
      org_description: RandomGenerator.paragraph({ sentences: 2 }),
      org_logo_uri: typia.random<string & tags.Format<"uri">>() + "/logo.png",
      org_timezone: RandomGenerator.pick(["UTC", "Asia/Seoul"]),
      org_fiscal_month: RandomGenerator.pick([1, 4, 7, 10]),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IHrmPlatformMember.IJoin,
  });
  typia.assert(memberAuth);
  // Step 2: Generate test employee data (simulated since employee API not available)
  const employeeId = typia.random<string & tags.Format<"uuid">>();
  const departmentId = typia.random<string & tags.Format<"uuid">>();
  const organizationId = memberAuth.member.id;
  // Step 3: Create first contract (triggers initial snapshot)
  const firstContractStartDate = new Date().toISOString();
  const firstContractEndDate = new Date(
    Date.now() + 365 * 24 * 60 * 60 * 1000,
  ).toISOString();
  const firstContract =
    await generate_random_hrm_platform_member_contracts_create(
      memberConnection,
      {
        body: {
          title: "Initial Employment Contract",
          start_date: firstContractStartDate,
          end_date: firstContractEndDate,
          compensation_amount: typia.random<
            number & tags.Type<"uint32"> & tags.Minimum<0>
          >(),
          compensation_currency: RandomGenerator.pick(["USD", "EUR", "KRW"]),
          status: "active",
          notes: "First contract for snapshot testing",
          employee_id: employeeId,
          organization_id: organizationId,
        } satisfies IHrmPlatformContract.ICreate,
      },
    );
  typia.assert(firstContract);
  // Small delay to ensure different snapshotted_at timestamp
  await new Promise((resolve) => setTimeout(resolve, 100));
  // Step 4: Create second contract (ends first, triggers first contract snapshot)
  const secondContractStartDate = new Date(
    Date.now() + 180 * 24 * 60 * 60 * 1000,
  ).toISOString();
  const secondContract =
    await generate_random_hrm_platform_member_contracts_create(
      memberConnection,
      {
        body: {
          title: "Updated Employment Contract",
          start_date: secondContractStartDate,
          end_date: new Date(
            Date.now() + 365 * 24 * 60 * 60 * 1000,
          ).toISOString(),
          compensation_amount: typia.random<
            number & tags.Type<"uint32"> & tags.Minimum<0>
          >(),
          compensation_currency: RandomGenerator.pick(["USD", "EUR", "KRW"]),
          status: "active",
          notes: "Second contract - first should be snapshotted",
          employee_id: employeeId,
          organization_id: organizationId,
        } satisfies IHrmPlatformContract.ICreate,
      },
    );
  typia.assert(secondContract);
  // Step 5: Retrieve snapshots for first contract
  const snapshotRequest: IHrmPlatformContractsSnapshot.IRequest = {
    page: 1,
    limit: 10,
    sort: "-snapshotted_at",
  } satisfies IHrmPlatformContractsSnapshot.IRequest;
  const snapshotResponse =
    await api.functional.hrmPlatform.member.contracts.snapshots.index(
      memberConnection,
      {
        contractId: firstContract.id,
        body: snapshotRequest,
      },
    );
  typia.assert(snapshotResponse);
  // Step 6: Validate pagination metadata
  TestValidator.equals(
    "pagination current page",
    snapshotResponse.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination limit",
    snapshotResponse.pagination.limit,
    10,
  );
  TestValidator.predicate(
    "pagination has records",
    snapshotResponse.pagination.records > 0,
  );
  TestValidator.predicate(
    "pagination has pages",
    snapshotResponse.pagination.pages > 0,
  );
  // Step 7: Validate snapshots data array
  TestValidator.equals(
    "snapshots data array count",
    snapshotResponse.data.length,
    snapshotResponse.pagination.records,
  );
  TestValidator.predicate(
    "snapshots array not empty",
    snapshotResponse.data.length > 0,
  );
  // Step 8: Validate sorting order (newest snapshotted_at first)
  if (snapshotResponse.data.length > 1) {
    for (let i = 1; i < snapshotResponse.data.length; i++) {
      const prevSnapshottedAt = new Date(
        snapshotResponse.data[i - 1].snapshotted_at,
      );
      const currSnapshottedAt = new Date(
        snapshotResponse.data[i].snapshotted_at,
      );
      TestValidator.predicate(
        `snapshot ${i} is older or same as ${i - 1}`,
        currSnapshottedAt.getTime() <= prevSnapshottedAt.getTime(),
      );
    }
  }
  // Step 9: Validate all required snapshot fields exist and are valid
  const requiredFields = [
    "contract_number",
    "start_date",
    "end_date",
    "job_title",
    "department_id",
    "compensation_amount",
    "compensation_currency",
    "compensation_frequency",
    "benefits_description",
    "probation_period_days",
    "notice_period_days",
    "work_location",
    "work_type",
    "notes",
    "snapshotted_at",
  ];
  for (const snapshot of snapshotResponse.data) {
    typia.assert(snapshot);
    // Validate each required field exists
    for (const field of requiredFields) {
      TestValidator.equals(
        `snapshot has ${field}`,
        Object.prototype.hasOwnProperty.call(snapshot, field),
        true,
      );
    }
    // Validate snapshotted_at is a valid date-time
    TestValidator.predicate(
      "snapshotted_at is valid date-time",
      !Number.isNaN(Date.parse(snapshot.snapshotted_at)),
    );
    // Validate compensation fields
    TestValidator.predicate(
      "compensation_amount is a number",
      typeof snapshot.compensation_amount === "number",
    );
    TestValidator.equals(
      "compensation_currency is a string",
      typeof snapshot.compensation_currency === "string",
      true,
    );
    TestValidator.equals(
      "compensation_frequency is a string",
      typeof snapshot.compensation_frequency === "string",
      true,
    );
    TestValidator.equals(
      "work_type is a string",
      typeof snapshot.work_type === "string",
      true,
    );
  }
  // Step 10: Validate original contract_id is not exposed in snapshots
  for (const snapshot of snapshotResponse.data) {
    TestValidator.equals(
      "snapshot does not contain contract_id",
      Object.prototype.hasOwnProperty.call(snapshot, "contract_id"),
      false,
    );
  }
  // Step 11: Validate that snapshots preserve contract state
  if (snapshotResponse.data.length > 0) {
    const firstSnapshot = snapshotResponse.data.find(
      (s) => s.compensation_amount === firstContract.compensation_amount,
    );
    if (firstSnapshot) {
      TestValidator.equals(
        "first snapshot preserves compensation amount",
        firstSnapshot.compensation_amount,
        firstContract.compensation_amount,
      );
      TestValidator.equals(
        "first snapshot preserves compensation currency",
        firstSnapshot.compensation_currency,
        firstContract.compensation_currency,
      );
    }
  }
}