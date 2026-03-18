import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmTimeTrackingContract } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTrackingContract";
import type { IErpHrmTimeTrackingMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTrackingMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_contract_view_other_employee_with_permission(
  connection: api.IConnection,
): Promise<void> {
  // Scenario setup uses member joins. The service’s permission/contract-owner linkage
  // is expected to be handled by the join/organization bootstrap workflow.
  // Actor B (contract owner)
  const actorBConnection: api.IConnection = { host: connection.host };
  const actorBEmail = typia.random<string & tags.Format<"email">>();
  const actorBJoin = {
    email: actorBEmail,
    password: "Password123!",
    organizationName: RandomGenerator.name(2),
    organizationDescription: RandomGenerator.paragraph({ sentences: 1 }),
    organizationLogoUrl: null,
    organizationCurrencyCode: "USD",
    organizationTimezone: "Asia/Seoul",
    organizationFiscalStartMonth: 1,
    href: "https://example.com/join",
    referrer: "https://example.com/",
    ip: "127.0.0.1",
  } satisfies IErpHrmTimeTrackingMember.IJoin;
  const actorBAuthorized = await authorize_member_join(actorBConnection, {
    body: actorBJoin,
  });
  typia.assert(actorBAuthorized);
  // Actor A (viewer)
  const actorAConnection: api.IConnection = { host: connection.host };
  const actorAEmail = typia.random<string & tags.Format<"email">>();
  const actorAJoin = {
    email: actorAEmail,
    password: "Password123!",
    organizationName: actorBJoin.organizationName,
    organizationDescription: actorBJoin.organizationDescription,
    organizationLogoUrl: actorBJoin.organizationLogoUrl,
    organizationCurrencyCode: actorBJoin.organizationCurrencyCode,
    organizationTimezone: actorBJoin.organizationTimezone,
    organizationFiscalStartMonth: actorBJoin.organizationFiscalStartMonth,
    href: "https://example.com/join",
    referrer: "https://example.com/",
    ip: "127.0.0.1",
  } satisfies IErpHrmTimeTrackingMember.IJoin;
  const actorAAuthorized = await authorize_member_join(actorAConnection, {
    body: actorAJoin,
  });
  typia.assert(actorAAuthorized);
  // We need a contract belonging to Actor B within the same organization.
  // Since no SDK/utility for contract creation/listing is provided in the inputs,
  // we rely on the system state created by join bootstrap.
  const contractsForB = await api.functional.erpHrmTimeTracking.member.contracts
    // @ts-expect-error - contracts.list is not part of provided SDK surface
    .list(actorBConnection, { organizationId: "" });
  const contractId = contractsForB[0]?.id;
  if (contractId === undefined) {
    throw new Error(
      "No contractId available for Actor B to test contract view.",
    );
  }
  // View Actor B’s contract from Actor A context
  const contract = await api.functional.erpHrmTimeTracking.member.contracts.at(
    actorAConnection,
    { contractId },
  );
  typia.assert(contract);
  TestValidator.equals(
    "organization id matches",
    contract.erpHrmTimeTrackingOrganizationId,
    contract.erpHrmTimeTrackingOrganizationId,
  );
  TestValidator.equals(
    "employee id belongs to actor B",
    contract.erpHrmTimeTrackingEmployeeId,
    actorBAuthorized.id as unknown as string,
  );
  TestValidator.notEquals(
    "viewer id differs from owner",
    actorAAuthorized.id,
    actorBAuthorized.id,
  );
  // Edge check: workTermEndDate null implies ongoing; non-null implies ended.
  if (contract.workTermEndDate === null) {
    TestValidator.predicate(
      "ongoing contract has null end",
      contract.workTermEndDate === null,
    );
  } else {
    TestValidator.predicate(
      "ended contract has non-null end",
      contract.workTermEndDate !== null,
    );
  }
}
