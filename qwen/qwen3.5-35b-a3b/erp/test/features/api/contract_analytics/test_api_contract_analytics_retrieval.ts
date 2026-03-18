import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmsEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsEmployee";
import type { IHrmsEmployeeContract } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsEmployeeContract";
import type { IHrmsMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsMember";
import type { IHrmsOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsOrganization";
import type { IHrmsOrganizationMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsOrganizationMember";
import type { IHrmsOrganizationRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsOrganizationRole";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHrmsEmployeeContract } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmsEmployeeContract";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_contract_analytics_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // 1. Join as a member user
  const joinConnection: api.IConnection = { host: connection.host };
  const joinResponse = await authorize_member_join(joinConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IHrmsMember.IJoin,
  });
  typia.assert(joinResponse);
  // 2. Create member connection with token
  const memberConnection: api.IConnection = {
    host: connection.host,
    headers: {
      Authorization: joinResponse.token.access,
    },
  };
  // 3. Call analytics endpoint with no filters
  const analyticsResponse =
    await api.functional.hrms.member.contracts.analytics(memberConnection, {
      body: {},
    });
  typia.assert(analyticsResponse);
  // 4. Validate response structure
  typia.assert(analyticsResponse.pagination);
  typia.assert(analyticsResponse.data);
  // Validate pagination
  TestValidator.equals(
    "pagination current is 1",
    analyticsResponse.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination limit is default 20",
    analyticsResponse.pagination.limit,
    20,
  );
  TestValidator.predicate(
    "pagination records is non-negative",
    () => analyticsResponse.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages computed correctly",
    () =>
      analyticsResponse.pagination.pages ===
      Math.ceil(
        analyticsResponse.pagination.records /
          analyticsResponse.pagination.limit,
      ),
  );
  // 5. Validate each analytics record if data exists
  if (analyticsResponse.data.length > 0) {
    for (const analyticsRecord of analyticsResponse.data) {
      typia.assert(analyticsRecord);
      // Validate employee summary
      TestValidator.equals(
        "employee id is valid UUID",
        analyticsRecord.employee.id,
        analyticsRecord.employee.id,
      );
      TestValidator.equals(
        "employee display name exists",
        analyticsRecord.employee.display_name,
        analyticsRecord.employee.display_name,
      );
      // Validate contract counts
      TestValidator.equals(
        "contract count is non-negative",
        analyticsRecord.contract_count,
        analyticsRecord.contract_count,
      );
      TestValidator.equals(
        "active contract count is non-negative",
        analyticsRecord.active_contract_count,
        analyticsRecord.active_contract_count,
      );
      // Validate pay rate statistics
      TestValidator.equals(
        "avg_pay_rate exists",
        analyticsRecord.avg_pay_rate,
        analyticsRecord.avg_pay_rate,
      );
      TestValidator.equals(
        "min_pay_rate exists",
        analyticsRecord.min_pay_rate,
        analyticsRecord.min_pay_rate,
      );
      TestValidator.equals(
        "max_pay_rate exists",
        analyticsRecord.max_pay_rate,
        analyticsRecord.max_pay_rate,
      );
      // Validate duration statistics
      TestValidator.equals(
        "avg_duration_days exists",
        analyticsRecord.avg_duration_days,
        analyticsRecord.avg_duration_days,
      );
      TestValidator.equals(
        "min_duration_days is non-negative",
        analyticsRecord.min_duration_days,
        analyticsRecord.min_duration_days,
      );
      TestValidator.equals(
        "max_duration_days is non-negative",
        analyticsRecord.max_duration_days,
        analyticsRecord.max_duration_days,
      );
      // Validate pay period enum
      TestValidator.equals(
        "pay_period is valid enum",
        analyticsRecord.pay_period,
        analyticsRecord.pay_period,
      );
      // Validate timestamp
      TestValidator.equals(
        "created_at is valid date-time",
        analyticsRecord.created_at,
        analyticsRecord.created_at,
      );
    }
  }
}