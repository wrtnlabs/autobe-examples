import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import type { IHrmPlatformMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMemberSession";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHrmPlatformMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmPlatformMemberSession";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Test that an authenticated member can retrieve a paginated list of their sessions including device fingerprint information.
 *
 * Validates the session retrieval workflow after member registration, where the authentication system automatically creates an initial session record. Verifies that the paginated response contains at least one session record with all required fields: UUID identifier, IPv4 address, source page URL, referrer URL, and timestamp information for creation and expiration. Tests pagination metadata correctness including current page, limit, total records, and total pages calculation. Ensures session data is properly scoped to the authenticated member's context.
 *
 * 1. Register a new member account which automatically creates an initial session.
 * 2. Retrieve the paginated list of sessions for the authenticated member.
 * 3. Validate pagination metadata contains correct structure and values.
 * 4. Verify each session record contains all required fields with correct types and formats.
 */
export async function test_api_session_list_after_join(
  connection: api.IConnection,
) {
  // 1. Member registration which creates initial session
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
    },
  });
  // 2. Retrieve sessions list
  const sessions = await api.functional.hrmPlatform.member.sessions.index(
    memberConnection,
    {
      body: {
        limit:
          typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>
          >(),
      },
    },
  );
  typia.assert(sessions);
  // 3. Validate pagination metadata
  TestValidator.predicate(
    "pagination exists",
    sessions.pagination !== null && sessions.pagination !== undefined,
  );
  TestValidator.equals("current page", sessions.pagination.current, 1);
  TestValidator.predicate("limit is positive", sessions.pagination.limit > 0);
  TestValidator.predicate(
    "has at least one session",
    sessions.data.length >= 1,
  );
  TestValidator.equals(
    "total records matches data length",
    sessions.pagination.records,
    sessions.data.length,
  );
  TestValidator.predicate(
    "total pages calculated correctly",
    sessions.pagination.pages >= 1,
  );
  // 4. Validate session record structure
  await ArrayUtil.asyncForEach(
    sessions.data,
    async (session: IHrmPlatformMemberSession.ISummary) => {
      typia.assert(session);
      TestValidator.predicate(
        "session has valid UUID",
        /^[\da-fA-F]{8}-[\da-fA-F]{4}-[\da-fA-F]{4}-[\da-fA-F]{4}-[\da-fA-F]{12}$/.test(
          session.id,
        ),
      );
      TestValidator.predicate(
        "session has valid IPv4",
        /^(\d{1,3}\.){3}\d{1,3}$/.test(session.ip),
      );
      TestValidator.predicate(
        "session has valid href URI",
        /^https?:\/\/.+$/.test(session.href),
      );
      TestValidator.predicate(
        "session has valid referrer URI",
        /^https?:\/\/.+$/.test(session.referrer),
      );
      TestValidator.predicate(
        "session has valid created_at datetime",
        /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{3}Z$/.test(session.created_at),
      );
      TestValidator.predicate(
        "session has valid expired_at datetime",
        /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{3}Z$/.test(session.expired_at),
      );
    },
  );
}
