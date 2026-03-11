import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditPlatformMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditPlatformMemberSession";
import type { IRedditPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformComment";
import type { IRedditPlatformCommentVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommentVote";
import type { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import type { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import type { IRedditPlatformMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMemberSession";
import type { IRedditPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPost";
import type { IRedditPlatformPostVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPostVote";
import type { IRedditPlatformReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformReport";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_session_list(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create new member account and obtain authentication
  const memberConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      username: RandomGenerator.alphaNumeric(10),
      password: RandomGenerator.alphaNumeric(12),
      displayName: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
      avatarUrl: null,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IRedditPlatformMember.IJoin,
  });
  typia.assert(authorized);
  // 2. Request session list with default pagination (using same authenticated connection)
  const sessionListResponse =
    await api.functional.redditPlatform.member.sessions.index(
      memberConnection,
      {
        body: {} satisfies IRedditPlatformMemberSession.IRequest,
      },
    );
  typia.assert(sessionListResponse);
  // 3. Validate pagination metadata exists
  TestValidator.equals(
    "response has pagination metadata",
    sessionListResponse.pagination !== undefined,
    true,
  );
  const pagination = sessionListResponse.pagination;
  // 4. Validate pagination field types and constraints
  TestValidator.equals(
    "pagination current is non-negative int32",
    pagination.current,
    Math.max(0, pagination.current) satisfies number as number,
  );
  TestValidator.equals(
    "pagination limit is non-negative int32",
    pagination.limit,
    Math.max(0, pagination.limit) satisfies number as number,
  );
  TestValidator.equals(
    "pagination records is non-negative int32",
    pagination.records,
    Math.max(0, pagination.records) satisfies number as number,
  );
  TestValidator.equals(
    "pagination pages is non-negative int32",
    pagination.pages,
    Math.max(0, pagination.pages) satisfies number as number,
  );
  // 5. Validate pagination relationships
  TestValidator.equals(
    "records count matches data array length",
    pagination.records,
    sessionListResponse.data.length,
  );
  TestValidator.equals(
    "pages calculated correctly",
    pagination.pages,
    pagination.records === 0
      ? 0
      : Math.ceil(pagination.records / pagination.limit),
  );
  // 6. Validate session data structure and required fields
  for (const session of sessionListResponse.data) {
    typia.assert(session);
    typia.assert(session.id);
    typia.assert(session.member);
    typia.assert(session.ip);
    typia.assert(session.href);
    typia.assert(session.referrer);
    typia.assert(session.created_at);
    typia.assert(session.expired_at);
    TestValidator.equals(
      "session id is valid UUID",
      /^[0-9a-f-]{36}$/i.test(session.id),
      true,
    );
    TestValidator.equals(
      "member has valid username",
      session.member.username.length > 0,
      true,
    );
    TestValidator.equals(
      "session has valid IP address",
      session.ip.length > 0,
      true,
    );
    TestValidator.equals(
      "href can be null or valid URI",
      session.href === null || /^[a-z][a-z0-9+.-]*:/i.test(session.href),
      true,
    );
    TestValidator.equals(
      "referrer can be null or valid URI",
      session.referrer === null ||
        /^[a-z][a-z0-9+.-]*:/i.test(session.referrer),
      true,
    );
    TestValidator.equals(
      "created_at is valid date-time",
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(session.created_at),
      true,
    );
    TestValidator.equals(
      "expired_at is valid date-time",
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(session.expired_at),
      true,
    );
  }
  // 7. Verify sessions are sorted by created_at descending (newest first)
  if (sessionListResponse.data.length > 1) {
    const isSorted = sessionListResponse.data.every((session, index) => {
      if (index === 0) return true;
      return (
        sessionListResponse.data[index - 1]?.created_at >= session.created_at
      );
    });
    TestValidator.equals("sessions sorted by created_at DESC", isSorted, true);
  }
  // 8. Verify member reference in sessions matches authenticated user
  const expectedMemberId = authorized.user.id;
  for (const session of sessionListResponse.data) {
    TestValidator.equals(
      "session member ID matches authenticated user",
      session.member.id,
      expectedMemberId,
    );
  }
}