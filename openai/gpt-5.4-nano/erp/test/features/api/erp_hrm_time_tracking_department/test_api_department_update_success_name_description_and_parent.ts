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

export async function test_api_department_update_success_name_description_and_parent(
  connection: api.IConnection,
): Promise<void> {
  // 1) Authenticate as a member (join)
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphabets(10),
      organizationName: RandomGenerator.name(),
      organizationDescription: RandomGenerator.paragraph({ sentences: 2 }),
      organizationCurrencyCode: RandomGenerator.pick(["USD", "KRW", "EUR"]),
      organizationTimezone: "Asia/Seoul",
      organizationFiscalStartMonth: 1,
      href: "https://example.com/join",
      referrer: "https://example.com/referrer",
      ip: null,
    } satisfies IErpHrmTimeTrackingMember.IJoin,
  });
  // 2) Create target department and parent candidate department
  const target =
    await generate_random_erp_hrm_time_tracking_member_departments_create(
      memberConnection,
      {
        body: {
          name: `dept-${RandomGenerator.alphabets(8)}`,
          description: RandomGenerator.paragraph({ sentences: 1 }),
          parent_department_id: null,
        } satisfies IErpHrmTimeTrackingDepartment.ICreate,
      },
    );
  typia.assert(target);
  const parentCandidate =
    await generate_random_erp_hrm_time_tracking_member_departments_create(
      memberConnection,
      {
        body: {
          name: `parent-${RandomGenerator.alphabets(8)}`,
          description: null,
          parent_department_id: null,
        } satisfies IErpHrmTimeTrackingDepartment.ICreate,
      },
    );
  typia.assert(parentCandidate);
  const preCreatedAt = target.createdAt;
  const preUpdatedAt = target.updatedAt;
  // 3) Update target department
  const updatedName = `dept-updated-${RandomGenerator.alphabets(10)}`;
  const updatedDescription = RandomGenerator.paragraph({ sentences: 2 });
  const updated1 =
    await api.functional.erpHrmTimeTracking.member.departments.update(
      memberConnection,
      {
        departmentId: target.id,
        body: {
          name: updatedName,
          description: updatedDescription,
          parentDepartmentId: parentCandidate.id,
        } satisfies IErpHrmTimeTrackingDepartment.IUpdate,
      },
    );
  typia.assert(updated1);
  // 4) Validate response after first update
  TestValidator.equals("department id unchanged", updated1.id, target.id);
  TestValidator.equals("name updated", updated1.name, updatedName);
  TestValidator.equals(
    "description updated",
    updated1.description,
    updatedDescription,
  );
  TestValidator.equals(
    "parentDepartmentId updated",
    updated1.parentDepartmentId,
    parentCandidate.id,
  );
  TestValidator.equals("createdAt unchanged", updated1.createdAt, preCreatedAt);
  TestValidator.predicate(
    "updatedAt later than previous",
    updated1.updatedAt > preUpdatedAt,
  );
  // 5) Update again: description -> null, name and parent unchanged
  const updated2 =
    await api.functional.erpHrmTimeTracking.member.departments.update(
      memberConnection,
      {
        departmentId: target.id,
        body: {
          name: updatedName,
          description: null,
          parentDepartmentId: parentCandidate.id,
        } satisfies IErpHrmTimeTrackingDepartment.IUpdate,
      },
    );
  typia.assert(updated2);
  // 6) Validate response after second update
  TestValidator.equals(
    "department id unchanged second update",
    updated2.id,
    target.id,
  );
  TestValidator.equals("description cleared", updated2.description, null);
  TestValidator.equals("name unchanged", updated2.name, updatedName);
  TestValidator.equals(
    "parentDepartmentId unchanged",
    updated2.parentDepartmentId,
    parentCandidate.id,
  );
}
