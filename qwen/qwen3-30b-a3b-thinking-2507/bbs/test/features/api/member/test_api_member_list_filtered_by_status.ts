import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardMember";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
export async function test_api_member_list_filtered_by_status(
  connection: api.IConnection,
): Promise<void> {
  // Authenticate as member
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await api.functional.auth.member.join(memberConnection, {
    body: {
      href: "https://example.com",
      referrer: "https://referrer.com",
      ip: "127.0.0.1",
    },
  });
  typia.assert(member);
  // Test filtering by all possible statuses
  for (const status of ["active", "pending", "inactive", "banned"] as const) {
    const filteredData =
      await api.functional.discussionBoard.member.members.index(
        memberConnection,
        {
          body: {
            status,
          } satisfies IDiscussionBoardMember.IRequest,
        },
      );
    typia.assert(filteredData);
    // Verify that all members in the response have the expected status
    for (const member of filteredData.data) {
      TestValidator.equals(
        `member status should be ${status}`,
        member.status,
        status,
      );
    }
  }
}
