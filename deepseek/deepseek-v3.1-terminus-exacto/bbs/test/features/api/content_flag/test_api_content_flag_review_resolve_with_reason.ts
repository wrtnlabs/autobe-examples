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

export async function test_api_content_flag_review_resolve_with_reason(
  connection: api.IConnection,
): Promise<void> {
  // Create admin connection and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  typia.assert(admin);
  // Create user connection and authenticate for content flag submission
  const userConnection: api.IConnection = { host: connection.host };
  const user = await authorize_user_join(userConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
    } satisfies IDiscussionBoardUser.IJoin,
  });
  typia.assert(user);
  // Note: This test simulates a scenario where a content flag is created.
  // But cannot flag existing content due to missing API endpoints for.
  // article/comment creation. We'll create a flag with minimal required data.
  // to demonstrate the review workflow.
  // User creates a content flag with required flag_reason only
  const flag = await api.functional.discussionBoard.user.content_flags.create(
    userConnection,
    {
      body: {
        flag_reason: RandomGenerator.paragraph({ sentences: 2 }),
      } satisfies IDiscussionBoardContentFlag.ICreate,
    },
  );
  typia.assert(flag);
  // Admin reviews and resolves the content flag with reason
  const reviewResult =
    await api.functional.discussionBoard.admin.content_flags.review(
      adminConnection,
      {
        flagId: flag.id,
        body: {
          status: "resolved",
          resolution_reason: RandomGenerator.paragraph({ sentences: 1 }),
        } satisfies IDiscussionBoardContentFlag.IReview,
      },
    );
  typia.assert(reviewResult);
  // Validate the review response
  TestValidator.equals(
    "status should be resolved",
    reviewResult.status,
    "resolved",
  );
  TestValidator.notEquals(
    "resolution_reason should be set",
    reviewResult.resolution_reason,
    null,
  );
  TestValidator.equals(
    "reviewingAdmin should be populated",
    reviewResult.reviewingAdmin?.id,
    admin.id,
  );
  TestValidator.notEquals(
    "resolved_at should be set",
    reviewResult.resolved_at,
    null,
  );
  TestValidator.predicate("resolved_at should be valid date", () => {
    if (!reviewResult.resolved_at) return false;
    return !isNaN(new Date(reviewResult.resolved_at).getTime());
  });
}
