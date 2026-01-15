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
export async function test_api_discussion_board_channel_list_basic(
  connection: api.IConnection,
) {
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      href: "https://example.com",
      referrer: "https://example.com",
      ip: null,
    },
  });
  const channels = await api.functional.discussionBoard.member.channels.index(
    memberConnection,
    {
      body: {
        page: 1,
        limit: 10,
      },
    },
  );
  typia.assert(channels);
  TestValidator.equals(
    "pagination current is 1",
    channels.pagination.current,
    1,
  );
  TestValidator.equals("pagination limit is 10", channels.pagination.limit, 10);
  TestValidator.predicate(
    "pagination records should be non-negative",
    channels.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages should be non-negative",
    channels.pagination.pages >= 0,
  );
  if (channels.data.length > 0) {
    const channel = channels.data[0];
    TestValidator.predicate("channel name is defined", channel.name.length > 0);
    TestValidator.predicate("channel type is defined", channel.type.length > 0);
    TestValidator.predicate(
      "channel active is boolean",
      typeof channel.active === "boolean",
    );
    TestValidator.predicate(
      "channel created_at is ISO date format",
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{3}Z$/.test(channel.created_at),
    );
  }
}
