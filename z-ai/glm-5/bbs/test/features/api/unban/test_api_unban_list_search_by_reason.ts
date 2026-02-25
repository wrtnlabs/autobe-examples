import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardBan";
import type { IDiscussionBoardUnban } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUnban";
import type { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardUnban } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardUnban";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";
import { generate_random_discussion_board_bans_create } from "../../../generate/generate_random_discussion_board_bans_create";
import { generate_random_discussion_board_unbans_create } from "../../../generate/generate_random_discussion_board_unbans_create";
import { prepare_random_discussion_board_ban } from "../../../prepare/prepare_random_discussion_board_ban";
import { prepare_random_discussion_board_unban } from "../../../prepare/prepare_random_discussion_board_unban";

export async function test_api_unban_list_search_by_reason(
  connection: api.IConnection,
): Promise<void> {
  // Create a user that will be banned and unbanned
  const userConnection: api.IConnection = { host: connection.host };
  const user = await authorize_user_join(userConnection, {});
  typia.assert(user);
  // Create an admin to perform ban/unban operations
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_user_join(adminConnection, {});
  typia.assert(admin);
  // Ban the user
  const ban = await generate_random_discussion_board_bans_create(
    adminConnection,
    {
      body: {
        userId: user.id,
        reason: RandomGenerator.paragraph({ sentences: 3 }),
      },
    },
  );
  typia.assert(ban);
  // Create an unban with a distinctive reason text
  const distinctiveReason =
    "Appeal approved after comprehensive review of evidence and mitigating circumstances";
  const unban = await generate_random_discussion_board_unbans_create(
    adminConnection,
    {
      body: {
        discussion_board_ban_id: ban.id,
        reason: distinctiveReason,
      },
    },
  );
  typia.assert(unban);
  // Test 1: Search with partial keyword from the reason
  const searchResults = await api.functional.discussionBoard.unbans.index(
    adminConnection,
    {
      body: {
        search: "appeal",
      } satisfies IDiscussionBoardUnban.IRequest,
    },
  );
  typia.assert(searchResults);
  // Verify the search returns the matching unban record
  TestValidator.predicate(
    "search results not empty",
    searchResults.data.length > 0,
  );
  TestValidator.predicate(
    "created unban found in results",
    searchResults.data.some((item) => item.id === unban.id),
  );
  // Test 2: Verify case-insensitive partial matching
  const caseInsensitiveResults =
    await api.functional.discussionBoard.unbans.index(adminConnection, {
      body: {
        search: "APPEAL",
      } satisfies IDiscussionBoardUnban.IRequest,
    });
  typia.assert(caseInsensitiveResults);
  TestValidator.predicate(
    "case insensitive search works",
    caseInsensitiveResults.data.some((item) => item.id === unban.id),
  );
  // Test 3: Search with another partial keyword from the reason
  const evidenceResults = await api.functional.discussionBoard.unbans.index(
    adminConnection,
    {
      body: {
        search: "evidence",
      } satisfies IDiscussionBoardUnban.IRequest,
    },
  );
  typia.assert(evidenceResults);
  TestValidator.predicate(
    "partial keyword 'evidence' found",
    evidenceResults.data.some((item) => item.id === unban.id),
  );
  // Test 4: Verify unrelated search terms return empty results
  const unrelatedResults = await api.functional.discussionBoard.unbans.index(
    adminConnection,
    {
      body: {
        search: "xyznonexistent123",
      } satisfies IDiscussionBoardUnban.IRequest,
    },
  );
  typia.assert(unrelatedResults);
  TestValidator.predicate(
    "unrelated search returns empty results",
    !unrelatedResults.data.some((item) => item.id === unban.id),
  );
}
