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
 * Test content flag reviewer assignment and reassignment workflow.
 *
 * Validates that content flags can be assigned to different super administrators
 * for review, and that reviewer assignments can be updated without affecting
 * the flag's core status or resolution history. Tests both assignment and
 * unassignment scenarios to ensure flexible moderation workflow management.
 */
export async function test_api_content_flag_reviewer_assignment_and_reassignment(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create regular user who will report content
  const userConnection: api.IConnection = { host: connection.host };
  const user = await authorize_user_join(userConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "password123",
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
    },
  });
  typia.assert(user);
  // 2. Create an article that will be flagged
  const article = await generate_random_discussion_board_user_articles_create(
    userConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        content: RandomGenerator.content({ paragraphs: 3 }),
        section_id: typia.random<string & tags.Format<"uuid">>(),
        status: "published",
      },
    },
  );
  typia.assert(article);
  // 3. User reports the article as inappropriate content
  const contentFlag =
    await generate_random_discussion_board_user_content_flags_create(
      userConnection,
      {
        body: {
          flag_reason: RandomGenerator.paragraph({ sentences: 3 }),
          flagged_article_id: article.id,
        },
      },
    );
  typia.assert(contentFlag);
  // 4. Create first super administrator
  const superAdmin1Connection: api.IConnection = { host: connection.host };
  const superAdmin1 = await authorize_super_admin_join(superAdmin1Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "admin123",
      privilege_level: "super_admin",
    },
  });
  typia.assert(superAdmin1);
  // 5. Create second super administrator
  const superAdmin2Connection: api.IConnection = { host: connection.host };
  const superAdmin2 = await authorize_super_admin_join(superAdmin2Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "admin123",
      privilege_level: "super_admin",
    },
  });
  typia.assert(superAdmin2);
  // 6. First super admin assigns themselves as reviewer
  const initialAssignment =
    await api.functional.discussionBoard.superAdmin.content_flags.update(
      superAdmin1Connection,
      {
        flagId: contentFlag.id,
        body: {
          status: "under_review",
          resolution_reason: null,
          reviewing_admin_id: superAdmin1.id,
        } satisfies IDiscussionBoardContentFlag.IUpdate,
      },
    );
  typia.assert(initialAssignment);
  // Validate initial assignment
  TestValidator.equals(
    "reviewer assigned to first admin",
    initialAssignment.reviewingAdmin?.id,
    superAdmin1.id,
  );
  TestValidator.equals(
    "status changed to under_review",
    initialAssignment.status,
    "under_review",
  );
  // 7. Second super admin reassigns the flag to themselves
  const reassignment =
    await api.functional.discussionBoard.superAdmin.content_flags.update(
      superAdmin2Connection,
      {
        flagId: contentFlag.id,
        body: {
          status: "under_review",
          resolution_reason: null,
          reviewing_admin_id: superAdmin2.id,
        } satisfies IDiscussionBoardContentFlag.IUpdate,
      },
    );
  typia.assert(reassignment);
  // Validate reassignment
  TestValidator.equals(
    "reviewer reassigned to second admin",
    reassignment.reviewingAdmin?.id,
    superAdmin2.id,
  );
  TestValidator.equals(
    "status remains under_review",
    reassignment.status,
    "under_review",
  );
  // 8. Test unassignment by setting reviewing_admin_id to null
  const unassignment =
    await api.functional.discussionBoard.superAdmin.content_flags.update(
      superAdmin2Connection,
      {
        flagId: contentFlag.id,
        body: {
          status: "under_review",
          resolution_reason: null,
          reviewing_admin_id: null,
        } satisfies IDiscussionBoardContentFlag.IUpdate,
      },
    );
  typia.assert(unassignment);
  // Validate unassignment
  TestValidator.equals(
    "reviewer unassigned",
    unassignment.reviewingAdmin,
    null,
  );
  TestValidator.equals(
    "status remains unchanged",
    unassignment.status,
    "under_review",
  );
  // Validate that flag ID and creation details remain consistent
  TestValidator.equals(
    "flag ID remains consistent",
    unassignment.id,
    contentFlag.id,
  );
  TestValidator.equals(
    "reporter remains consistent",
    unassignment.reporter.id,
    user.id,
  );
  TestValidator.equals(
    "flagged article remains consistent",
    unassignment.flaggedArticle?.id,
    article.id,
  );
}
