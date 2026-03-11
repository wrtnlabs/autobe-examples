import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardGuest";
import type { IDiscussionBoardGuestSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardGuestSession";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardGuestSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardGuestSession";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_member_sessions_filter_by_ip_address(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member authentication
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      displayName: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IDiscussionBoardMember.IJoin,
  });
  typia.assert(member);
  // 2. Query sessions with IP address filter
  // Use a randomly generated IPv4 address as filter
  const filterIpAddress = typia.random<string & tags.Format<"ipv4">>();
  const sessions = await api.functional.discussionBoard.member.sessions.index(
    memberConnection,
    {
      body: {
        ipAddress: filterIpAddress,
      } satisfies IDiscussionBoardGuestSession.IRequest,
    },
  );
  typia.assert(sessions);
  // 3. Validate pagination metadata
  TestValidator.equals(
    "pagination current page",
    sessions.pagination.current,
    1,
  );
  TestValidator.equals("pagination limit", sessions.pagination.limit, 30);
  TestValidator.predicate(
    "pagination records non-negative",
    sessions.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages non-negative",
    sessions.pagination.pages >= 0,
  );
  // 4. Validate all returned sessions match the filtered IP address
  await TestValidator.predicate("all sessions match filtered IP", async () => {
    for (const session of sessions.data) {
      if (session.ip !== filterIpAddress) {
        return false;
      }
    }
    return true;
  });
}
