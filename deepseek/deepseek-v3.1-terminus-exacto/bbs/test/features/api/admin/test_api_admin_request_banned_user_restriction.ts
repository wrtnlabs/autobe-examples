import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardAdminRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdminRequest";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardUserBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUserBan";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_discussion_board_admin_user_bans_create } from "../../../generate/generate_random_discussion_board_admin_user_bans_create";
import { generate_random_discussion_board_member_admin_requests_create } from "../../../generate/generate_random_discussion_board_member_admin_requests_create";
import { prepare_random_discussion_board_admin_request } from "../../../prepare/prepare_random_discussion_board_admin_request";
import { prepare_random_discussion_board_user_ban } from "../../../prepare/prepare_random_discussion_board_user_ban";

export async function test_api_admin_request_banned_user_restriction(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create and authenticate as admin
  const adminConnection: api.IConnection = { host: connection.host };
  const adminCredentials = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
  } satisfies IDiscussionBoardAdmin.IJoin;
  const adminAuth = await authorize_admin_join(adminConnection, {
    body: adminCredentials,
  });
  typia.assert(adminAuth);
  // Step 2: Create and authenticate as member
  const memberConnection: api.IConnection = { host: connection.host };
  const memberCredentials = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    display_name: RandomGenerator.name(),
    bio: RandomGenerator.paragraph({ sentences: 2 }),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
    ip: typia.random<string & tags.Format<"ipv4">>(),
  } satisfies IDiscussionBoardMember.IJoin;
  const memberAuth = await authorize_member_join(memberConnection, {
    body: memberCredentials,
  });
  typia.assert(memberAuth);
  // Step 3: Admin bans the member
  const banReason = RandomGenerator.paragraph({ sentences: 1 });
  const banRecord =
    await generate_random_discussion_board_admin_user_bans_create(
      adminConnection,
      {
        body: {
          member_id: memberAuth.id,
          reason: banReason,
          expires_at: null,
        } satisfies IDiscussionBoardUserBan.ICreate,
      },
    );
  typia.assert(banRecord);
  // Step 4: Attempt to submit admin request as banned member
  const adminRequestReason = RandomGenerator.paragraph({ sentences: 3 });
  await TestValidator.error(
    "banned user cannot submit admin request",
    async () => {
      await generate_random_discussion_board_member_admin_requests_create(
        memberConnection,
        {
          body: {
            reason: adminRequestReason,
          } satisfies IDiscussionBoardAdminRequest.ICreate,
        },
      );
    },
  );
  // The ban restriction is validated by the error test above
  // No need for additional validation as the error test confirms the restriction is working
}
