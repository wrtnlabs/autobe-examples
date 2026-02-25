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

export async function test_api_content_flag_review_dismiss_with_reason(
  connection: api.IConnection,
): Promise<void> {
  // Create user connection and register user
  const userConnection: api.IConnection = { host: connection.host };
  const userAuth = await authorize_user_join(userConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "user1234",
      display_name: RandomGenerator.name(),
    } satisfies IDiscussionBoardUser.IJoin,
  });
  // Create admin connection and register admin
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "admin1234",
      display_name: RandomGenerator.name(),
      href: "http://localhost:3000",
      referrer: "http://localhost:3000",
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  // Create content flag as user
  const contentFlag =
    await generate_random_discussion_board_user_content_flags_create(
      userConnection,
      {
        body: {
          flag_reason: RandomGenerator.paragraph({ sentences: 2 }),
          flagged_article_id: null, // Using null for simplicity, avoiding article creation dependency
          flagged_comment_id: typia.random<string & tags.Format<"uuid">>(),
        } satisfies IDiscussionBoardContentFlag.ICreate,
      },
    );
  typia.assert(contentFlag);
  // Admin reviews and dismisses the flag with reason
  const reviewedFlag =
    await api.functional.discussionBoard.admin.content_flags.review(
      adminConnection,
      {
        flagId: contentFlag.id,
        body: {
          status: "dismissed",
          resolution_reason: "Flag does not violate community guidelines",
        } satisfies IDiscussionBoardContentFlag.IReview,
      },
    );
  typia.assert(reviewedFlag);
  // Validate flag status and resolution details
  TestValidator.equals(
    "flag status should be dismissed",
    reviewedFlag.status,
    "dismissed",
  );
  TestValidator.equals(
    "resolution reason should be stored",
    reviewedFlag.resolution_reason,
    "Flag does not violate community guidelines",
  );
  TestValidator.predicate(
    "reviewing admin should be set",
    reviewedFlag.reviewingAdmin !== null,
  );
  TestValidator.predicate(
    "resolved_at timestamp should be set",
    reviewedFlag.resolved_at !== null,
  );
  // Proper admin ID comparison
  if (reviewedFlag.reviewingAdmin) {
    TestValidator.equals(
      "reviewing admin id should match administrator",
      reviewedFlag.reviewingAdmin.id,
      adminAuth.id,
    );
  }
}
