import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmDepartment";
import type { IErpHrmEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmEmployee";
import type { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import type { IErpHrmMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMemberSession";
import type { IErpHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganization";
import type { IErpHrmProjectMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmProjectMember";
import type { IErpHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRole";
import type { IErpHrmTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTask";
import type { IErpHrmTimer } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimer";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIErpHrmMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIErpHrmMemberSession";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_member_sessions_filter_by_date_range(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as a member
  const memberConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_member_join(memberConnection, {});
  typia.assert(authorized);
  // 2. Record current timestamp as reference
  const now = new Date();
  const oneHourMs = 60 * 60 * 1000;
  // 3. Call PATCH /erpHrm/member/sessions with both created_from and created_to
  const createdFrom = new Date(now.getTime() - oneHourMs);
  const createdTo = new Date(now.getTime() + oneHourMs);
  const rangeResponse = await api.functional.erpHrm.member.sessions.index(
    memberConnection,
    {
      body: {
        created_from: createdFrom.toISOString(),
        created_to: createdTo.toISOString(),
      } satisfies IErpHrmMemberSession.IRequest,
    },
  );
  typia.assert(rangeResponse);
  // 4. Verify sessions fall within the specified range
  for (const session of rangeResponse.data) {
    const sessionCreatedAt = new Date(session.created_at);
    TestValidator.predicate(
      "session created_at within range",
      sessionCreatedAt >= createdFrom && sessionCreatedAt <= createdTo,
    );
  }
  // 5. Call PATCH /erpHrm/member/sessions with created_from only
  const fromOnlyResponse = await api.functional.erpHrm.member.sessions.index(
    memberConnection,
    {
      body: {
        created_from: createdFrom.toISOString(),
      } satisfies IErpHrmMemberSession.IRequest,
    },
  );
  typia.assert(fromOnlyResponse);
  // 6. Verify all returned sessions have created_at >= created_from
  for (const session of fromOnlyResponse.data) {
    const sessionCreatedAt = new Date(session.created_at);
    TestValidator.predicate(
      "session created_at >= created_from",
      sessionCreatedAt >= createdFrom,
    );
  }
  // 7. Call PATCH /erpHrm/member/sessions with created_to only
  const toOnlyResponse = await api.functional.erpHrm.member.sessions.index(
    memberConnection,
    {
      body: {
        created_to: createdTo.toISOString(),
      } satisfies IErpHrmMemberSession.IRequest,
    },
  );
  typia.assert(toOnlyResponse);
  // 8. Verify all returned sessions have created_at <= created_to
  for (const session of toOnlyResponse.data) {
    const sessionCreatedAt = new Date(session.created_at);
    TestValidator.predicate(
      "session created_at <= created_to",
      sessionCreatedAt <= createdTo,
    );
  }
  // 9. Validate pagination metadata exists in all responses
  TestValidator.predicate(
    "range response has valid pagination",
    rangeResponse.pagination !== null && rangeResponse.pagination !== undefined,
  );
  TestValidator.predicate(
    "from-only response has valid pagination",
    fromOnlyResponse.pagination !== null &&
      fromOnlyResponse.pagination !== undefined,
  );
  TestValidator.predicate(
    "to-only response has valid pagination",
    toOnlyResponse.pagination !== null &&
      toOnlyResponse.pagination !== undefined,
  );
  // Validate pagination structure values
  TestValidator.predicate(
    "pagination has non-negative current page",
    rangeResponse.pagination.current >= 0,
  );
  TestValidator.predicate(
    "pagination has non-negative limit",
    rangeResponse.pagination.limit >= 0,
  );
  TestValidator.predicate(
    "pagination has non-negative records",
    rangeResponse.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination has non-negative pages",
    rangeResponse.pagination.pages >= 0,
  );
}
