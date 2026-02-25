import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardBanAppeal } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardBanAppeal";
import type { IDiscussionBoardBanRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardBanRecord";
import type { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";
import { generate_random_discussion_board_admin_bans_create } from "../../../generate/generate_random_discussion_board_admin_bans_create";
import { generate_random_discussion_board_user_bans_appeals_create } from "../../../generate/generate_random_discussion_board_user_bans_appeals_create";
import { prepare_random_discussion_board_ban_appeal } from "../../../prepare/prepare_random_discussion_board_ban_appeal";
import { prepare_random_discussion_board_ban_record } from "../../../prepare/prepare_random_discussion_board_ban_record";

export async function test_api_ban_appeal_review_rejection(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as administrator
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_login(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "admin1234",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardAdmin.ILogin,
  });
  // 2. Create user account and authenticate as user
  const userConnection: api.IConnection = { host: connection.host };
  const userAuth = await authorize_user_join(userConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "user1234",
      display_name: RandomGenerator.name(),
    } satisfies IDiscussionBoardUser.IJoin,
  });
  // 3. Administrator creates ban record for the user
  const banRecord = await api.functional.discussionBoard.admin.bans.create(
    adminConnection,
    {
      body: {
        bannedUserId: userAuth.id,
        banReason: RandomGenerator.paragraph({ sentences: 3 }),
        banDurationType: "temporary",
        banDurationDays: typia.random<
          number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<30>
        >(),
      } satisfies IDiscussionBoardBanRecord.ICreate,
    },
  );
  typia.assert(banRecord);
  // 4. User submits ban appeal
  const banAppeal =
    await api.functional.discussionBoard.user.bans.appeals.create(
      userConnection,
      {
        banId: banRecord.id,
        body: {
          appeal_reason: RandomGenerator.paragraph({ sentences: 4 }),
        } satisfies IDiscussionBoardBanAppeal.ICreate,
      },
    );
  typia.assert(banAppeal);
  // 5. Administrator reviews and rejects the appeal
  const updatedAppeal =
    await api.functional.discussionBoard.admin.bans.appeals.update(
      adminConnection,
      {
        banId: banRecord.id,
        body: {
          status: "rejected",
          decision_reason: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies IDiscussionBoardBanAppeal.IUpdate,
      },
    );
  typia.assert(updatedAppeal);
  // 6. Validate appeal rejection worked correctly
  TestValidator.equals(
    "appeal status should be rejected",
    updatedAppeal.status,
    "rejected",
  );
  TestValidator.predicate(
    "decision reason should be set",
    updatedAppeal.decision_reason !== null,
  );
  TestValidator.predicate(
    "reviewed_at should be set",
    updatedAppeal.reviewed_at !== null,
  );
  TestValidator.notEquals(
    "reviewer should be set",
    updatedAppeal.reviewer,
    null,
  );
  TestValidator.equals(
    "reviewer id should match admin",
    updatedAppeal.reviewer!.id,
    (adminConnection.headers?.Authorization as any)?.id,
  );
  // 7. Test that user cannot submit another appeal for same ban
  await TestValidator.error(
    "user cannot submit appeal for same ban",
    async () => {
      await api.functional.discussionBoard.user.bans.appeals.create(
        userConnection,
        {
          banId: banRecord.id,
          body: {
            appeal_reason: RandomGenerator.paragraph({ sentences: 3 }),
          } satisfies IDiscussionBoardBanAppeal.ICreate,
        },
      );
    },
  );
}
