import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberSession";
import type { ICommunityPlatformProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformProfile";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformMemberSession";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_member_sessions_listing_after_join(
  connection: api.IConnection,
): Promise<void> {
  // 1. Join a new member — creates an authenticated session automatically
  const memberConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_member_join(memberConnection, {
    body: {},
  });
  typia.assert(authorized);
  // 2. List sessions with default pagination (no request body parameters)
  const output: IPageICommunityPlatformMemberSession.ISummary =
    await api.functional.communityPlatform.member.sessions.index(
      memberConnection,
      { body: {} satisfies ICommunityPlatformMemberSession.IRequest },
    );
  typia.assert(output);
  // 3-4. Assert at least one session exists (join-created session)
  TestValidator.predicate(
    "has at least one active session",
    output.data.length >= 1,
  );
  // 5. Validate each session record and perform security check
  for (const session of output.data) {
    typia.assert(session);
    // 6. Security: refresh_token_hash must never be exposed
    TestValidator.predicate(
      "no refresh_token_hash exposed",
      !("refresh_token_hash" in session),
    );
    // Validate expired_at is a future timestamp
    TestValidator.predicate(
      "expired_at is in the future",
      new Date(session.expired_at).getTime() > Date.now(),
    );
  }
  // 7. Validate pagination metadata
  const pagination: IPage.IPagination = output.pagination;
  TestValidator.predicate("current >= 1", pagination.current >= 1);
  TestValidator.predicate("limit > 0", pagination.limit > 0);
  TestValidator.predicate("records >= 1", pagination.records >= 1);
  TestValidator.predicate("pages >= 1", pagination.pages >= 1);
  // 8. Verify pages calculation: Math.ceil(records / limit)
  TestValidator.equals(
    "pages = ceil(records / limit)",
    pagination.pages,
    Math.ceil(pagination.records / pagination.limit),
  );
}
