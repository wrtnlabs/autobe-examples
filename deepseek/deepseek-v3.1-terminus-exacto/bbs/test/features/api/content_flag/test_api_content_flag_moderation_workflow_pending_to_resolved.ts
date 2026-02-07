import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardComment";
import type { IDiscussionBoardContentFlag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardContentFlag";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import type { IDiscussionBoardSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdmin";
import type { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";
import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";
import { generate_random_discussion_board_user_articles_create } from "../../../generate/generate_random_discussion_board_user_articles_create";
import { generate_random_discussion_board_user_content_flags_create } from "../../../generate/generate_random_discussion_board_user_content_flags_create";
import { prepare_random_discussion_board_article } from "../../../prepare/prepare_random_discussion_board_article";
import { prepare_random_discussion_board_content_flag } from "../../../prepare/prepare_random_discussion_board_content_flag";

/**
 * Test the complete moderation workflow for a content flag from initial reporting to final resolution.
 * A regular user reports an article for inappropriate content by creating a content flag with a detailed reason.
 * A super administrator then updates the flag status from 'pending' to 'under_review' and assigns themselves as the reviewer.
 * After investigation, the super administrator resolves the flag with a detailed resolution reason explaining the moderation decision.
 * Validate that status transitions follow the correct workflow (pending → under_review → resolved), that resolution_reason is required when status changes to resolved,
 * and that the resolved_at timestamp is automatically set. Verify the complete flag object is returned with all updated fields including reviewer assignment and resolution details.
 */
export async function test_api_content_flag_moderation_workflow_pending_to_resolved(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create regular user and authenticate
  const userConnection: api.IConnection = { host: connection.host };
  const userAuth = await authorize_user_join(userConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
    } satisfies IDiscussionBoardUser.IJoin,
  });
  typia.assert(userAuth);
  // 2. Create an article as the regular user (using a realistic section ID)
  const article = await generate_random_discussion_board_user_articles_create(
    userConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        content: RandomGenerator.content({
          paragraphs: 1,
          sentenceMin: 3,
          sentenceMax: 5,
        }),
        section_id: typia.random<string & tags.Format<"uuid">>(),
        status: "published" as const,
      } satisfies IDiscussionBoardArticle.ICreate,
    },
  );
  typia.assert(article);
  // 3. Report the article as inappropriate content
  const contentFlag =
    await generate_random_discussion_board_user_content_flags_create(
      userConnection,
      {
        body: {
          flag_reason: RandomGenerator.paragraph({ sentences: 3 }),
          flagged_article_id: article.id,
        } satisfies IDiscussionBoardContentFlag.ICreate,
      },
    );
  typia.assert(contentFlag);
  // Validate initial flag status
  TestValidator.equals(
    "initial status should be pending",
    contentFlag.status,
    "pending",
  );
  TestValidator.predicate(
    "resolution reason should be null initially",
    contentFlag.resolution_reason === null,
  );
  TestValidator.predicate(
    "resolved_at should be null initially",
    contentFlag.resolved_at === null,
  );
  // 4. Create super administrator and authenticate
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdminAuth = await authorize_super_admin_join(
    superAdminConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: typia.random<string & tags.Format<"password">>(),
        privilege_level: "super_admin",
      } satisfies IDiscussionBoardSuperAdmin.IJoin,
    },
  );
  typia.assert(superAdminAuth);
  // 5. Update flag status to 'under_review' and assign reviewer
  const underReviewFlag =
    await api.functional.discussionBoard.superAdmin.content_flags.update(
      superAdminConnection,
      {
        flagId: contentFlag.id,
        body: {
          status: "under_review",
          resolution_reason: null,
          reviewing_admin_id: superAdminAuth.id,
        } satisfies IDiscussionBoardContentFlag.IUpdate,
      },
    );
  typia.assert(underReviewFlag);
  // 6. Validate status transition and reviewer assignment
  TestValidator.equals(
    "status should be under_review",
    underReviewFlag.status,
    "under_review",
  );
  TestValidator.predicate(
    "reviewer should be assigned",
    underReviewFlag.reviewingAdmin !== null,
  );
  TestValidator.equals(
    "reviewer ID should match",
    underReviewFlag.reviewingAdmin?.id,
    superAdminAuth.id,
  );
  TestValidator.predicate(
    "resolution reason should remain null",
    underReviewFlag.resolution_reason === null,
  );
  TestValidator.predicate(
    "resolved_at should remain null",
    underReviewFlag.resolved_at === null,
  );
  // 7. Resolve the flag with detailed resolution reason
  const resolutionReason = RandomGenerator.paragraph({ sentences: 2 });
  const resolvedFlag =
    await api.functional.discussionBoard.superAdmin.content_flags.update(
      superAdminConnection,
      {
        flagId: contentFlag.id,
        body: {
          status: "resolved",
          resolution_reason: resolutionReason,
          reviewing_admin_id: superAdminAuth.id,
        } satisfies IDiscussionBoardContentFlag.IUpdate,
      },
    );
  typia.assert(resolvedFlag);
  // 8. Validate final resolution
  TestValidator.equals(
    "status should be resolved",
    resolvedFlag.status,
    "resolved",
  );
  TestValidator.equals(
    "resolution reason should match input",
    resolvedFlag.resolution_reason,
    resolutionReason,
  );
  TestValidator.predicate(
    "resolved_at timestamp should be set",
    resolvedFlag.resolved_at !== null,
  );
  TestValidator.equals(
    "reviewer should remain assigned",
    resolvedFlag.reviewingAdmin?.id,
    superAdminAuth.id,
  );
  // 9. Validate workflow progression and timestamps
  TestValidator.predicate(
    "created_at should be before resolved_at",
    new Date(resolvedFlag.created_at) < new Date(resolvedFlag.resolved_at!),
  );
  TestValidator.predicate(
    "updated_at should be after creation",
    new Date(resolvedFlag.updated_at) > new Date(resolvedFlag.created_at),
  );
  TestValidator.predicate(
    "updated_at should reflect final resolution",
    new Date(resolvedFlag.updated_at) >= new Date(resolvedFlag.resolved_at!),
  );
  // 10. Test invalid status transition (should fail)
  await TestValidator.error(
    "should reject invalid status transition",
    async () => {
      await api.functional.discussionBoard.superAdmin.content_flags.update(
        superAdminConnection,
        {
          flagId: contentFlag.id,
          body: {
            status: "pending",
            resolution_reason: null,
            reviewing_admin_id: superAdminAuth.id,
          } satisfies IDiscussionBoardContentFlag.IUpdate,
        },
      );
    },
  );
}
