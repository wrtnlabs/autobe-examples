import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmPlatformContract } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformContract";
import type { IHrmPlatformDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformDepartment";
import type { IHrmPlatformEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformEmployee";
import type { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import type { IHrmPlatformMemberEmailVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMemberEmailVerification";
import type { IHrmPlatformMemberPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMemberPasswordReset";
import type { IHrmPlatformMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMemberSession";
import type { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
import type { IHrmPlatformRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformRole";
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

export async function test_api_contract_update_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member account and organization
  const joinConnection: api.IConnection = { host: connection.host };
  const joinResult = await authorize_member_join(joinConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      name: RandomGenerator.name(),
      org_name: RandomGenerator.name(),
      org_currency: RandomGenerator.pick(["USD", "EUR", "KRW"]),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IHrmPlatformMember.IJoin,
  });
  typia.assert(joinResult);
  // Extract organization_id from the member's sessions (organization is nested in session)
  const organization_id =
    joinResult.sessions?.[0]?.organization?.id ??
    typia.random<string & tags.Format<"uuid">>();
  // 2. Create initial contract (employee_id is random UUID since we don't have create employee endpoint)
  const employee_id = typia.random<string & tags.Format<"uuid">>();
  const initialContract =
    await api.functional.hrmPlatform.member.contracts.create(joinConnection, {
      body: {
        title: "Initial Employment Contract",
        start_date: new Date().toISOString(),
        end_date: undefined,
        compensation_amount: typia.random<number & tags.Minimum<0>>(),
        compensation_currency: RandomGenerator.pick(["USD", "KRW"]),
        status: "active" as const,
        notes: "Initial contract notes",
        employee_id,
        organization_id,
      } satisfies IHrmPlatformContract.ICreate,
    });
  typia.assert(initialContract);
  // 3. Update the contract
  const newTitle = RandomGenerator.paragraph({ sentences: 2 });
  const newCompensation = typia.random<
    number & tags.Type<"uint32"> & tags.Minimum<1>
  >();
  const newCurrency = RandomGenerator.pick(["USD", "EUR", "KRW"]);
  const newNotes = RandomGenerator.paragraph({ sentences: 3 });
  const updatedContract =
    await api.functional.hrmPlatform.member.contracts.update(joinConnection, {
      contractId: initialContract.id,
      body: {
        title: newTitle,
        compensation_amount: newCompensation,
        compensation_currency: newCurrency,
        notes: newNotes,
      } satisfies IHrmPlatformContract.IUpdate,
    });
  typia.assert(updatedContract);
  // 4. Validate the update
  TestValidator.equals(
    "contract title updated",
    updatedContract.title,
    newTitle,
  );
  TestValidator.equals(
    "compensation amount updated",
    updatedContract.compensation_amount,
    newCompensation,
  );
  TestValidator.equals(
    "currency updated",
    updatedContract.compensation_currency,
    newCurrency,
  );
  TestValidator.equals("notes updated", updatedContract.notes, newNotes);
  // Verify status remains active
  TestValidator.equals(
    "status remains active",
    updatedContract.status,
    "active",
  );
  // Verify relationships preserved
  TestValidator.equals(
    "employee reference preserved",
    updatedContract.employee.id,
    employee_id,
  );
  TestValidator.equals(
    "organization reference preserved",
    updatedContract.organization.id,
    organization_id,
  );
  // Verify timestamps
  TestValidator.notEquals(
    "updated_at changed",
    initialContract.updated_at,
    updatedContract.updated_at,
  );
  TestValidator.equals(
    "created_at unchanged",
    initialContract.created_at,
    updatedContract.created_at,
  );
  // Verify id remains unchanged
  TestValidator.equals("id unchanged", initialContract.id, updatedContract.id);
}
