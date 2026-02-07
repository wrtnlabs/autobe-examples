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

/**
 * Test the resolution workflow where an administrator resolves a content flag that is under review.
 * This scenario validates the proper resolution process requiring a detailed resolution reason.
 */
export async function test_api_content_flag_update_under_review_to_resolved_with_reason(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create and authenticate regular user
  const userConnection: api.IConnection = { host: connection.host };
  await authorize_user_join(userConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
    } satisfies IDiscussionBoardUser.IJoin,
  });
  // 2. Create content flag as user (initial status: 'pending')
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
  TestValidator.equals(
    "initial status should be pending",
    contentFlag.status,
    "pending",
  );
  // 3. Create and authenticate administrator
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  // 4. Update flag status from 'pending' to 'under_review' (assign admin as reviewer)
  const underReviewFlag =
    await api.functional.discussionBoard.admin.content_flags.update(
      adminConnection,
      {
        flagId: contentFlag.id,
        body: {
          status: "under_review",
          resolution_reason: null,
          reviewing_admin_id: adminAuth.id,
        } satisfies IDiscussionBoardContentFlag.IUpdate,
      },
    );
  typia.assert(underReviewFlag);
  TestValidator.equals(
    "status should be under_review",
    underReviewFlag.status,
    "under_review",
  );
  TestValidator.equals(
    "reviewing admin should be assigned",
    underReviewFlag.reviewingAdmin?.id,
    adminAuth.id,
  );
  // 5. Update flag status from 'under_review' to 'resolved' with resolution reason
  const resolutionReason = RandomGenerator.paragraph({ sentences: 4 });
  const resolvedFlag =
    await api.functional.discussionBoard.admin.content_flags.update(
      adminConnection,
      {
        flagId: underReviewFlag.id,
        body: {
          status: "resolved",
          resolution_reason: resolutionReason,
          reviewing_admin_id: adminAuth.id,
        } satisfies IDiscussionBoardContentFlag.IUpdate,
      },
    );
  typia.assert(resolvedFlag);
  // 6. Validate resolution
  TestValidator.equals(
    "status should be resolved",
    resolvedFlag.status,
    "resolved",
  );
  TestValidator.equals(
    "resolution reason should match",
    resolvedFlag.resolution_reason,
    resolutionReason,
  );
  TestValidator.predicate(
    "resolved_at timestamp should be set",
    resolvedFlag.resolved_at !== null && resolvedFlag.resolved_at !== undefined,
  );
  TestValidator.predicate(
    "resolved_at should be valid date",
    !isNaN(new Date(resolvedFlag.resolved_at!).getTime()),
  );
  TestValidator.equals(
    "reviewing admin should remain assigned",
    resolvedFlag.reviewingAdmin?.id,
    adminAuth.id,
  );
}
