import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmsMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsMember";
import type { IHrmsMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsMemberSession";
import type { IHrmsOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsOrganization";
import type { IHrmsOrganizationMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsOrganizationMember";
import type { IHrmsOrganizationRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsOrganizationRole";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHrmsMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmsMemberSession";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_member_sessions_view(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member account and get authorization tokens
  const memberConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IHrmsMember.IJoin,
  });
  typia.assert(authorized);
  // 2. Create new connection with member's access token
  const memberAuthConnection: api.IConnection = {
    host: connection.host,
    headers: {
      Authorization: `Bearer ${authorized.token.access}`,
    },
  };
  // 3. List member's sessions
  const response: IPageIHrmsMemberSession.ISummary =
    await api.functional.hrms.member.sessions.index(memberAuthConnection, {
      body: typia.random<IHrmsMemberSession.IRequest>(),
    });
  typia.assert(response);
  // 4. Validate pagination structure
  TestValidator.equals(
    "pagination has current field",
    typeof response.pagination.current,
    "number",
  );
  TestValidator.equals(
    "pagination has limit field",
    typeof response.pagination.limit,
    "number",
  );
  TestValidator.equals(
    "pagination has records field",
    typeof response.pagination.records,
    "number",
  );
  TestValidator.equals(
    "pagination has pages field",
    typeof response.pagination.pages,
    "number",
  );
  // 5. Validate that all records belong to the authenticated member
  const allRecords: IHrmsMemberSession.ISummary[] = response.data;
  for (const session of allRecords) {
    typia.assert(session);
    TestValidator.equals(
      "session belongs to authenticated member",
      session.hrms_member_id,
      authorized.id,
    );
  }
  // 6. Verify sessions are ordered by created_at in descending order
  if (allRecords.length > 1) {
    for (let i = 1; i < allRecords.length; i++) {
      const prevCreatedAt: string = allRecords[i - 1].created_at;
      const currCreatedAt: string = allRecords[i].created_at;
      TestValidator.equals(
        "sessions ordered by created_at DESC",
        new Date(prevCreatedAt) >= new Date(currCreatedAt),
        true,
      );
    }
  }
  // 7. Verify each session has required fields with correct types
  for (const session of allRecords) {
    typia.assert(session);
    TestValidator.equals("session has valid id", typeof session.id, "string");
    TestValidator.equals(
      "session has valid member_id",
      typeof session.hrms_member_id,
      "string",
    );
    TestValidator.equals(
      "session has current_organization_id",
      session.current_organization_id === null ||
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
          session.current_organization_id,
        ),
      true,
    );
    TestValidator.equals("session has ip", typeof session.ip, "string");
    TestValidator.equals("session has href", typeof session.href, "string");
    TestValidator.equals(
      "session has referrer",
      typeof session.referrer,
      "string",
    );
    TestValidator.equals(
      "session has user_agent",
      typeof session.user_agent,
      "string",
    );
    TestValidator.equals(
      "session has valid created_at",
      typeof session.created_at,
      "string",
    );
    TestValidator.equals(
      "session has valid expired_at",
      typeof session.expired_at,
      "string",
    );
    // Validate organization field
    if (session.currentOrganization !== null) {
      typia.assert(session.currentOrganization);
      TestValidator.equals(
        "organization has valid id",
        typeof session.currentOrganization.id,
        "string",
      );
      TestValidator.equals(
        "organization has name",
        typeof session.currentOrganization.name,
        "string",
      );
    }
  }
}
