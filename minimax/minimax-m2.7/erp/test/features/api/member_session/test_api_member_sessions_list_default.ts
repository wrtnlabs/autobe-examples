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

export async function test_api_member_sessions_list_default(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as a member using join to create an account and establish session
  const memberConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_member_join(memberConnection, {});
  typia.assert(authorized);
  // 2. Call PATCH /erpHrm/member/sessions with an empty request body
  const response = await api.functional.erpHrm.member.sessions.index(
    memberConnection,
    {
      body: {},
    },
  );
  typia.assert(response);
  // 3. Verify the response structure includes pagination object with required fields
  TestValidator.predicate(
    "has pagination object",
    response.pagination !== undefined,
  );
  TestValidator.predicate(
    "pagination current is valid",
    response.pagination.current >= 0,
  );
  TestValidator.predicate(
    "pagination limit is valid",
    response.pagination.limit >= 0,
  );
  TestValidator.predicate(
    "pagination records is valid",
    response.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages is valid",
    response.pagination.pages >= 0,
  );
  // 4. Verify the response includes data array containing session summaries
  TestValidator.equals("has data array", Array.isArray(response.data), true);
  // 5. Verify each session summary contains required fields
  if (response.data.length > 0) {
    const session = response.data[0];
    // Verify session has all required properties
    TestValidator.predicate("session has id", !!session.id);
    TestValidator.predicate("session has ip", !!session.ip);
    TestValidator.predicate("session has href", !!session.href);
    TestValidator.predicate("session has referrer", !!session.referrer);
    TestValidator.predicate(
      "session has token_expired_at",
      !!session.token_expired_at,
    );
    TestValidator.predicate("session has created_at", !!session.created_at);
    TestValidator.predicate("session has expired_at", !!session.expired_at);
    TestValidator.predicate("session has member", !!session.member);
    // 6. Verify sensitive token data (access_token, refresh_token) are NOT included
    TestValidator.equals(
      "no access_token in session",
      (session as any).access_token,
      undefined,
    );
    TestValidator.equals(
      "no refresh_token in session",
      (session as any).refresh_token,
      undefined,
    );
    // 7. Verify member belongs to authenticated member's organization context
    TestValidator.equals(
      "member id matches authenticated user",
      session.member.id,
      authorized.id,
    );
    TestValidator.equals(
      "member email matches authenticated user",
      session.member.email,
      authorized.email,
    );
  }
  // 8. Confirm sessions are ordered by created_at in descending order (most recent first)
  if (response.data.length > 1) {
    for (let i = 0; i < response.data.length - 1; i++) {
      const current = new Date(response.data[i].created_at);
      const next = new Date(response.data[i + 1].created_at);
      TestValidator.predicate(
        `session ${i} should be created after or at same time as session ${i + 1}`,
        current >= next,
      );
    }
  }
}
