import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardComment";
import type { IDiscussionBoardSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";

export async function test_api_comment_deletion_impact_non_existent_comment(
  connection: api.IConnection,
): Promise<void> {
  // Create super administrator connection
  const superAdminConnection: api.IConnection = { host: connection.host };
  await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IDiscussionBoardSuperAdmin.IJoin,
  });
  // Generate a random UUID that doesn't correspond to any existing comment
  const nonExistentCommentId = typia.random<string & tags.Format<"uuid">>();
  // Analyze deletion impact on non-existent comment
  const deletionImpact =
    await api.functional.discussionBoard.superAdmin.comments.deletion_impact.deletionImpact(
      superAdminConnection,
      {
        commentId: nonExistentCommentId,
      },
    );
  typia.assert(deletionImpact);
  // Validate response indicates comment does not exist
  TestValidator.equals("comment exists status", deletionImpact.exists, false);
  TestValidator.equals("deletion eligibility", deletionImpact.eligible, false);
  TestValidator.equals("dependency count", deletionImpact.dependencyCount, 0);
  // Test restrictions contain appropriate message about non-existent comment
  TestValidator.predicate(
    "has restrictions array",
    deletionImpact.restrictions.length > 0,
  );
  TestValidator.predicate(
    "restrictions mention non-existent comment",
    deletionImpact.restrictions.some(
      (restriction) =>
        restriction.toLowerCase().includes("exist") ||
        restriction.toLowerCase().includes("not found") ||
        restriction.toLowerCase().includes("invalid"),
    ),
  );
  // Test message provides clear UI feedback
  TestValidator.predicate(
    "message provides actionable information",
    deletionImpact.message !== null &&
      deletionImpact.message !== undefined &&
      deletionImpact.message.length > 0,
  );
}
