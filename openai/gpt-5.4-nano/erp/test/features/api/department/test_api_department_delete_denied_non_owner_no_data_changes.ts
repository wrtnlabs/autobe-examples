import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmTimeTrackingDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTrackingDepartment";
import type { IErpHrmTimeTrackingMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTrackingMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_erp_hrm_time_tracking_member_departments_create } from "../../../generate/generate_random_erp_hrm_time_tracking_member_departments_create";
import { prepare_random_erp_hrm_time_tracking_department } from "../../../prepare/prepare_random_erp_hrm_time_tracking_department";

export async function test_api_department_delete_denied_non_owner_no_data_changes(
  connection: api.IConnection,
): Promise<void> {
  // 1) owner member join
  const ownerConnection: api.IConnection = { host: connection.host };
  const ownerCreds: IErpHrmTimeTrackingMember.IJoin = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphabets(12),
    organizationName: RandomGenerator.name(),
    organizationDescription: RandomGenerator.paragraph({ sentences: 2 }),
    organizationCurrencyCode: "USD",
    organizationTimezone: "Asia/Seoul",
    organizationFiscalStartMonth: typia.random<
      number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<12>
    >(),
    href: "https://example.com/join" satisfies string & tags.Format<"uri">,
    referrer: "https://example.com" satisfies string & tags.Format<"uri">,
    ip: undefined,
  };
  const ownerAuth = await authorize_member_join(ownerConnection, {
    body: ownerCreds,
  });
  typia.assert(ownerAuth);
  // 2) create departmentB with owner
  const departmentBPrepared = prepare_random_erp_hrm_time_tracking_department();
  const departmentB =
    await generate_random_erp_hrm_time_tracking_member_departments_create(
      ownerConnection,
      {
        body: {
          name: departmentBPrepared.name,
          description: departmentBPrepared.description,
          parent_department_id: departmentBPrepared.parent_department_id,
        } satisfies IErpHrmTimeTrackingDepartment.ICreate,
      },
    );
  typia.assert(departmentB);
  const departmentBId = departmentB.id;
  // 3) another member join (intended to be non-owner)
  const nonOwnerConnection: api.IConnection = { host: connection.host };
  const nonOwnerCreds: IErpHrmTimeTrackingMember.IJoin = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphabets(12),
    organizationName: ownerCreds.organizationName,
    organizationDescription: ownerCreds.organizationDescription,
    organizationCurrencyCode: ownerCreds.organizationCurrencyCode,
    organizationTimezone: ownerCreds.organizationTimezone,
    organizationFiscalStartMonth: ownerCreds.organizationFiscalStartMonth,
    href: ownerCreds.href,
    referrer: ownerCreds.referrer,
    ip: ownerCreds.ip,
  };
  const nonOwnerAuth = await authorize_member_join(nonOwnerConnection, {
    body: nonOwnerCreds,
  });
  typia.assert(nonOwnerAuth);
  // 4) non-owner attempts erase
  await TestValidator.httpError(
    "non-owner cannot delete department",
    [400, 403, 404],
    async () => {
      await api.functional.erpHrmTimeTracking.member.departments.erase(
        nonOwnerConnection,
        {
          departmentId: departmentBId,
        },
      );
    },
  );
}
