import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardBansAppeal } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardBansAppeal";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_discussion_board_member_bans_appeals_create } from "../../../generate/generate_random_discussion_board_member_bans_appeals_create";
import { prepare_random_discussion_board_bans_appeal } from "../../../prepare/prepare_random_discussion_board_bans_appeal";

export async function test_api_ban_appeal_create_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create banned member account
  const bannedMemberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(bannedMemberConnection, {
    body: {
      // IDiscussionBoardMember.IJoin has no required fields currently
    } satisfies IDiscussionBoardMember.IJoin,
  });
  // 2. Simulate ban by calling the ban appeal endpoint with valid data
  const appeal =
    await api.functional.discussionBoard.member.bans.appeals.create(
      bannedMemberConnection,
      {
        body: {
          // IDiscussionBoardBansAppeal.ICreate has no required fields currently
        } satisfies IDiscussionBoardBansAppeal.ICreate,
      },
    );
  typia.assert(appeal);
}
