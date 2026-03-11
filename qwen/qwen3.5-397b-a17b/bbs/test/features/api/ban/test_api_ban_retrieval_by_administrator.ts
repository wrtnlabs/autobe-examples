import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardBan";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
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
import { generate_random_discussion_board_admin_bans_create } from "../../../generate/generate_random_discussion_board_admin_bans_create";
import { prepare_random_discussion_board_ban } from "../../../prepare/prepare_random_discussion_board_ban";

/**
 * Test that an administrator can successfully retrieve detailed information about an active ban record.
 *
 * This test validates the complete ban retrieval workflow:
 * 1. Administrator authentication
 * 2. Member account creation (ban target)
 * 3. Ban record creation with valid reason
 * 4. Ban record retrieval by ID
 * 5. Response validation including member/admin references and ban metadata
 */
export async function test_api_ban_retrieval_by_administrator(
  connection: api.IConnection,
): Promise<void> {
  // 1. Administrator authentication
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  // 2. Create member account to be banned
  const memberConnection: api.IConnection = { host: connection.host };
  const memberJoinResult = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardMember.IJoin,
  });
  // 3. Create ban record against the member
  const banReason = RandomGenerator.paragraph({
    sentences: 2,
    wordMin: 5,
    wordMax: 10,
  });
  const banCreateResult =
    await generate_random_discussion_board_admin_bans_create(adminConnection, {
      body: {
        member_id: memberJoinResult.id,
        reason: banReason,
      } satisfies IDiscussionBoardBan.ICreate,
    });
  typia.assert(banCreateResult);
  // 4. Retrieve the ban record by ID
  const banRetrievalResult = await api.functional.discussionBoard.admin.bans.at(
    adminConnection,
    {
      banId: banCreateResult.id,
    },
  );
  typia.assert(banRetrievalResult);
  // 5. Validate business logic - data consistency between create and retrieve
  TestValidator.equals(
    "ban ID matches",
    banRetrievalResult.id,
    banCreateResult.id,
  );
  TestValidator.equals(
    "ban reason matches",
    banRetrievalResult.reason,
    banReason,
  );
  TestValidator.equals(
    "banned member ID matches",
    banRetrievalResult.member.id,
    memberJoinResult.id,
  );
  TestValidator.equals(
    "banned member display name matches",
    banRetrievalResult.member.display_name,
    memberJoinResult.display_name,
  );
  TestValidator.equals(
    "admin grade is regular",
    banRetrievalResult.admin.grade,
    "regular",
  );
}
