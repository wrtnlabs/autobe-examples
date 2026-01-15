import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardChannel } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardChannel";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardChannel } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardChannel";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
/**
 * Test channel listing with type parameter filtering. Validates that members
 * can retrieve channels grouped by type (e.g., 'technical' type), ensuring the
 * channel filtering functionality works correctly for common business
 * categories in the discussion board.
 */
export async function test_api_discussion_board_channel_list_filtered_by_type(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create a member connection with authentication
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      href: `https://member.test.com/${RandomGenerator.alphaNumeric(8)}`,
      referrer: `https://member.test.com/${RandomGenerator.alphaNumeric(8)}`,
      ip: RandomGenerator.alphaNumeric(15),
    },
  });
  // Step 2: Request technical channels
  const technicalChannels =
    await api.functional.discussionBoard.member.channels.index(
      memberConnection,
      {
        body: {
          page: 1,
          limit: 10,
          type: "technical",
        } satisfies IDiscussionBoardChannel.IRequest,
      },
    );
  typia.assert(technicalChannels);
  // Step 3: Validate technical channels exist with correct type
  TestValidator.predicate(
    "technical channels should exist",
    technicalChannels.data.length > 0,
  );
  technicalChannels.data.forEach((channel) => {
    TestValidator.equals("channel type", channel.type, "technical");
  });
  // Step 4: Request support channels
  const supportChannels =
    await api.functional.discussionBoard.member.channels.index(
      memberConnection,
      {
        body: {
          page: 1,
          limit: 10,
          type: "support",
        } satisfies IDiscussionBoardChannel.IRequest,
      },
    );
  typia.assert(supportChannels);
  // Step 5: Validate support channels exist with correct type
  TestValidator.predicate(
    "support channels should exist",
    supportChannels.data.length > 0,
  );
  supportChannels.data.forEach((channel) => {
    TestValidator.equals("channel type", channel.type, "support");
  });
}
