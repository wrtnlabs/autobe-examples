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

export async function test_api_ban_appeal_review_approval(
  connection: api.IConnection,
): Promise<void> {
  // 1. Administrator authentication
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_login(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "password123",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardAdmin.ILogin,
  });
  typia.assert(adminAuth);
  // 2. Create user to be banned
  const userConnection: api.IConnection = { host: connection.host };
  const userAuth = await authorize_user_join(userConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "password123",
      display_name: RandomGenerator.name(),
    } satisfies IDiscussionBoardUser.IJoin,
  });
  typia.assert(userAuth);
  // 3. Create ban record
  const banRecord = await generate_random_discussion_board_admin_bans_create(
    adminConnection,
    {
      body: {
        bannedUserId: userAuth.id,
        banReason: RandomGenerator.paragraph({ sentences: 3 }),
        banDurationType: "temporary",
        banDurationDays: typia.random<
          number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<30>
        >() satisfies number as number,
      } satisfies IDiscussionBoardBanRecord.ICreate,
    },
  );
  typia.assert(banRecord);
  // 4. User submits appeal
  const initialAppeal =
    await generate_random_discussion_board_user_bans_appeals_create(
      userConnection,
      {
        params: { banId: banRecord.id },
        body: {
          appeal_reason: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies IDiscussionBoardBanAppeal.ICreate,
      },
    );
  typia.assert(initialAppeal);
  TestValidator.equals(
    "appeal status is pending",
    initialAppeal.status,
    "pending",
  );
  TestValidator.equals(
    "no decision reason initially",
    initialAppeal.decision_reason,
    null,
  );
  TestValidator.equals(
    "not reviewed initially",
    initialAppeal.reviewed_at,
    null,
  );
  TestValidator.equals("no reviewer initially", initialAppeal.reviewer, null);
  // 5. Administrator reviews and approves appeal
  const decisionReason =
    "Appeal approved after review" satisfies string as string;
  const updatedAppeal =
    await api.functional.discussionBoard.admin.bans.appeals.update(
      adminConnection,
      {
        banId: banRecord.id,
        body: {
          status: "approved",
          decision_reason: decisionReason,
        } satisfies IDiscussionBoardBanAppeal.IUpdate,
      },
    );
  typia.assert(updatedAppeal);
  // 6. Validate appeal updates
  TestValidator.equals(
    "appeal status changed to approved",
    updatedAppeal.status,
    "approved",
  );
  TestValidator.equals(
    "decision reason recorded",
    updatedAppeal.decision_reason,
    decisionReason,
  );
  TestValidator.predicate(
    "reviewed_at timestamp set",
    updatedAppeal.reviewed_at !== null,
  );
  TestValidator.notEquals(
    "reviewer information added",
    updatedAppeal.reviewer,
    null,
  );
  TestValidator.equals(
    "reviewer is the admin",
    updatedAppeal.reviewer!.id,
    adminAuth.id,
  );
  TestValidator.equals(
    "ban record reference maintained",
    updatedAppeal.banRecord.id,
    banRecord.id,
  );
  TestValidator.equals(
    "user reference maintained",
    updatedAppeal.user.id,
    userAuth.id,
  );
  // 7. Validate appeal cannot be modified after approval
  await TestValidator.error("cannot modify approved appeal", async () => {
    await api.functional.discussionBoard.admin.bans.appeals.update(
      adminConnection,
      {
        banId: banRecord.id,
        body: {
          status: "pending",
          decision_reason: "Attempt to change status",
        } satisfies IDiscussionBoardBanAppeal.IUpdate,
      },
    );
  });
}
