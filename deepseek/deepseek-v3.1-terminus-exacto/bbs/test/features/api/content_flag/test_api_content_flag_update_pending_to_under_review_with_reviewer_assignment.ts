import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardComment";
import type { IDiscussionBoardContentFlag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardContentFlag";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
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
import { generate_random_discussion_board_user_content_flags_create } from "../../../generate/generate_random_discussion_board_user_content_flags_create";
import { prepare_random_discussion_board_content_flag } from "../../../prepare/prepare_random_discussion_board_content_flag";

export async function test_api_content_flag_update_pending_to_under_review_with_reviewer_assignment(
  connection: api.IConnection,
): Promise<void> {
  // Create user connection and authenticate
  const userConnection: api.IConnection = { host: connection.host };
  await authorize_user_join(userConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
    } satisfies IDiscussionBoardUser.IJoin,
  });
  // Create content flag in pending status
  const contentFlag =
    await generate_random_discussion_board_user_content_flags_create(
      userConnection,
      {
        body: {
          flag_reason: RandomGenerator.paragraph({ sentences: 3 }),
        } satisfies IDiscussionBoardContentFlag.ICreate,
      },
    );
  typia.assert(contentFlag);
  // Create administrator connection and authenticate, capturing the admin ID
  const adminConnection: api.IConnection = { host: connection.host };
  const authorizedAdmin = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  // Update content flag to under_review status with reviewer assignment
  const updatedFlag =
    await api.functional.discussionBoard.admin.content_flags.update(
      adminConnection,
      {
        flagId: contentFlag.id,
        body: {
          status: "under_review",
          resolution_reason: null,
          reviewing_admin_id: authorizedAdmin.id,
        } satisfies IDiscussionBoardContentFlag.IUpdate,
      },
    );
  typia.assert(updatedFlag);
  // Validate the flag transition
  TestValidator.equals(
    "flag status updated",
    updatedFlag.status,
    "under_review",
  );
  TestValidator.notEquals(
    "updated_at timestamp changed",
    updatedFlag.updated_at,
    contentFlag.updated_at,
  );
  TestValidator.predicate(
    "reviewer assigned",
    updatedFlag.reviewingAdmin !== null &&
      updatedFlag.reviewingAdmin !== undefined,
  );
  TestValidator.equals(
    "reviewer admin ID matches",
    updatedFlag.reviewingAdmin?.id,
    authorizedAdmin.id,
  );
  TestValidator.equals(
    "reporter remains same",
    updatedFlag.reporter.id,
    contentFlag.reporter.id,
  );
  TestValidator.equals(
    "flag reason unchanged",
    updatedFlag.flag_reason,
    contentFlag.flag_reason,
  );
  TestValidator.equals(
    "resolution_reason is null for under_review",
    updatedFlag.resolution_reason,
    null,
  );
  TestValidator.equals(
    "resolved_at remains null for under_review",
    updatedFlag.resolved_at,
    null,
  );
}
