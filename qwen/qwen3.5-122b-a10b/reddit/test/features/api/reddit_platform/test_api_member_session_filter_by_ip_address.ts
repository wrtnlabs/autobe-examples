import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditPlatformMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditPlatformMemberSession";
import type { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import type { IRedditPlatformMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMemberSession";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_member_session_filter_by_ip_address(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member account with specific IP
  const testIp: string & tags.Format<"ipv4"> = typia.random<
    string & tags.Format<"ipv4">
  >();
  const password = RandomGenerator.alphaNumeric(16);
  const memberConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_member_join(memberConnection, {
    body: {
      email: typia.assert<string & tags.MinLength<1> & tags.MaxLength<255> & tags.Format<"email">>(
        typia.random<string & tags.Format<"email">>()
      ),
      password,
      username: RandomGenerator.name(1),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: testIp,
    } satisfies IRedditPlatformMember.IJoin,
  });
  typia.assert(authorized);
  // 2. Get all sessions for the member
  const allSessionsResult =
    await api.functional.redditPlatform.member.sessions.index(
      memberConnection,
      {
        body: {} satisfies IRedditPlatformMemberSession.IRequest,
      },
    );
  typia.assert(allSessionsResult);
  // 3. Filter sessions by the IP address used during join
  const filteredResult =
    await api.functional.redditPlatform.member.sessions.index(
      memberConnection,
      {
        body: {
          ip: testIp,
        } satisfies IRedditPlatformMemberSession.IRequest,
      },
    );
  typia.assert(filteredResult);
  // 4. Validate that filtered results contain only sessions with matching IP
  TestValidator.predicate(
    "filtered results exist",
    filteredResult.data.length > 0,
  );
  // Verify all filtered sessions have the target IP
  for (const session of filteredResult.data) {
    TestValidator.equals("session IP matches filter", session.ip, testIp);
  }
  // 5. Validate pagination metadata
  TestValidator.equals(
    "pagination current page",
    filteredResult.pagination.current,
    1,
  );
  TestValidator.predicate(
    "pagination has records",
    filteredResult.pagination.records > 0,
  );
  TestValidator.predicate(
    "pagination pages >= 1",
    filteredResult.pagination.pages >= 1,
  );
  // 6. Test with non-existent IP (should return empty results)
  const nonExistentIp: string & tags.Format<"ipv4"> = "192.0.2.1";
  const emptyResult = await api.functional.redditPlatform.member.sessions.index(
    memberConnection,
    {
      body: {
        ip: nonExistentIp,
      } satisfies IRedditPlatformMemberSession.IRequest,
    },
  );
  typia.assert(emptyResult);
  TestValidator.equals(
    "empty result count for non-existent IP",
    emptyResult.data.length,
    0,
  );
  TestValidator.equals(
    "empty result records count",
    emptyResult.pagination.records,
    0,
  );
}