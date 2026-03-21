import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmAdmin";
import type { IErpHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmDepartment";
import type { IErpHrmEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmEmployee";
import type { IErpHrmGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmGuest";
import type { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import type { IErpHrmMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMemberSession";
import type { IErpHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganization";
import type { IErpHrmProjectMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmProjectMember";
import type { IErpHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRole";
import type { IErpHrmTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTask";
import type { IErpHrmTimer } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimer";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_session_retrieval_by_member(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new member account via POST /erpHrm/auth/member/join
  const memberConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      displayName: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(authorized);
  // 2. Extract sessionId from the authorized response
  // The sessionId is part of the token information returned from join
  const sessionId = authorized.id;
  // 3. Call GET /erpHrm/member/sessions/{sessionId} with the extracted sessionId
  const session = await api.functional.erpHrm.member.sessions.at(
    memberConnection,
    {
      sessionId: sessionId as string & tags.Format<"uuid">,
    },
  );
  typia.assert(session);
  // 4. Validate session_type equals 'member'
  TestValidator.equals(
    "session_type should be member",
    session.session_type,
    "member",
  );
  // 5. Validate id matches the requested sessionId
  TestValidator.equals(
    "session id should match requested sessionId",
    session.id,
    sessionId,
  );
  // 6. Validate member object with email and displayName populated
  TestValidator.predicate(
    "member should be defined",
    session.member !== undefined,
  );
  TestValidator.equals(
    "member email should match authorized email",
    session.member!.email,
    authorized.email,
  );
  TestValidator.equals(
    "member displayName should match authorized display_name",
    session.member!.displayName,
    authorized.display_name,
  );
  // 7. Validate ip, href, referrer fields are present
  TestValidator.predicate("ip should be defined", session.ip !== undefined);
  TestValidator.predicate("href should be defined", session.href !== undefined);
  TestValidator.predicate(
    "referrer should be defined",
    session.referrer !== undefined,
  );
  // 8. Validate created_at and expired_at timestamps in ISO 8601 format
  TestValidator.predicate(
    "created_at should be valid ISO 8601",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(session.created_at),
  );
  TestValidator.predicate(
    "expired_at should be valid ISO 8601",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(session.expired_at),
  );
  // 9. Validate access_token, refresh_token, token_expired_at fields present
  TestValidator.predicate(
    "access_token should be defined",
    session.access_token !== undefined,
  );
  TestValidator.predicate(
    "refresh_token should be defined",
    session.refresh_token !== undefined,
  );
  TestValidator.predicate(
    "token_expired_at should be defined",
    session.token_expired_at !== undefined,
  );
  // 10. Confirm expired_at is in the future (session is valid)
  const now = new Date();
  const expiredAt = new Date(session.expired_at);
  TestValidator.predicate(
    "expired_at should be in the future",
    expiredAt > now,
  );
  // 11. Verify token_expired_at is after current time
  const tokenExpiredAt = new Date(session.token_expired_at!);
  TestValidator.predicate(
    "token_expired_at should be after current time",
    tokenExpiredAt > now,
  );
}
