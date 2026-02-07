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
import { generate_random_discussion_board_user_content_flags_create } from "../../../generate/generate_random_discussion_board_user_content_flags_create";
import { prepare_random_discussion_board_content_flag } from "../../../prepare/prepare_random_discussion_board_content_flag";

export async function test_api_content_flag_retrieval_by_super_admin(
  connection: api.IConnection,
): Promise<void> {
  // Create reporter user account using SDK
  const reporterConnection: api.IConnection = { host: connection.host };
  const reporter = await api.functional.discussionBoard.auth.user.join(
    reporterConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        display_name: RandomGenerator.name(),
        bio: RandomGenerator.paragraph({ sentences: 2 }),
      } satisfies IDiscussionBoardUser.IJoin,
    },
  );
  typia.assert(reporter);
  // Create super admin account using SDK
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdmin = await api.functional.discussionBoard.auth.superAdmin.join(
    superAdminConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: typia.random<string & tags.Format<"password">>(),
        privilege_level: "super_admin",
      } satisfies IDiscussionBoardSuperAdmin.IJoin,
    },
  );
  typia.assert(superAdmin);
  // Create a content flag using the reporter user
  // Since we don't have actual articles/comments to flag, we'll create a flag without specific content reference
  const contentFlag =
    await api.functional.discussionBoard.user.content_flags.create(
      reporterConnection,
      {
        body: {
          flag_reason: RandomGenerator.paragraph({ sentences: 3 }),
          // Don't reference specific content since we don't have articles/comments created
        } satisfies IDiscussionBoardContentFlag.ICreate,
      },
    );
  typia.assert(contentFlag);
  // Retrieve the content flag as super admin
  const retrievedFlag =
    await api.functional.discussionBoard.superAdmin.content_flags.at(
      superAdminConnection,
      {
        flagId: contentFlag.id,
      },
    );
  typia.assert(retrievedFlag);
  // Validate the retrieved flag matches the created flag
  TestValidator.equals("flag ID matches", retrievedFlag.id, contentFlag.id);
  TestValidator.equals(
    "flag reason matches",
    retrievedFlag.flag_reason,
    contentFlag.flag_reason,
  );
  TestValidator.equals(
    "flag status is pending",
    retrievedFlag.status,
    "pending",
  );
  // Validate reporter information is included
  TestValidator.predicate(
    "reporter information exists",
    retrievedFlag.reporter !== undefined,
  );
  TestValidator.equals(
    "reporter ID matches",
    retrievedFlag.reporter.id,
    reporter.id,
  );
  TestValidator.equals(
    "reporter display name matches",
    retrievedFlag.reporter.display_name,
    reporter.display_name,
  );
  // Validate timestamps
  TestValidator.predicate(
    "created_at is valid date",
    new Date(retrievedFlag.created_at).getTime() > 0,
  );
  TestValidator.predicate(
    "updated_at is valid date",
    new Date(retrievedFlag.updated_at).getTime() > 0,
  );
  // Validate optional fields are properly set
  TestValidator.equals(
    "resolution_reason is null",
    retrievedFlag.resolution_reason,
    null,
  );
  TestValidator.equals("resolved_at is null", retrievedFlag.resolved_at, null);
  TestValidator.equals(
    "reviewingAdmin is null",
    retrievedFlag.reviewingAdmin,
    null,
  );
  TestValidator.equals("deleted_at is null", retrievedFlag.deleted_at, null);
  // Validate that no specific content is flagged since we didn't provide article/comment IDs
  TestValidator.equals(
    "flaggedArticle is null",
    retrievedFlag.flaggedArticle,
    null,
  );
  TestValidator.equals(
    "flaggedComment is null",
    retrievedFlag.flaggedComment,
    null,
  );
}
