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

export async function test_api_content_flag_update_reviewer_reassignment_and_status_transition(
  connection: api.IConnection,
): Promise<void> {
  // Create first administrator for initial assignment
  const admin1Connection: api.IConnection = { host: connection.host };
  const admin1 = await authorize_admin_join(admin1Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(admin1);
  // Create second administrator for reassignment
  const admin2Connection: api.IConnection = { host: connection.host };
  const admin2 = await authorize_admin_join(admin2Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(admin2);
  // Create user to report content flag
  const userConnection: api.IConnection = { host: connection.host };
  const user = await authorize_user_join(userConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
    },
  });
  typia.assert(user);
  // Create content flag
  const contentFlag =
    await generate_random_discussion_board_user_content_flags_create(
      userConnection,
      {
        body: {
          flag_reason: RandomGenerator.paragraph({ sentences: 3 }),
        },
      },
    );
  typia.assert(contentFlag);
  // Initial assignment by first administrator - set to under_review with admin1 as reviewer
  const initialUpdate =
    await api.functional.discussionBoard.admin.content_flags.update(
      admin1Connection,
      {
        flagId: contentFlag.id,
        body: {
          status: "under_review",
          resolution_reason: null,
          reviewing_admin_id: admin1.id,
        } satisfies IDiscussionBoardContentFlag.IUpdate,
      },
    );
  typia.assert(initialUpdate);
  // Verify initial assignment
  TestValidator.equals(
    "initial status should be under_review",
    initialUpdate.status,
    "under_review",
  );
  TestValidator.equals(
    "initial reviewer should be admin1",
    initialUpdate.reviewingAdmin?.id,
    admin1.id,
  );
  TestValidator.predicate(
    "resolution reason should be null",
    initialUpdate.resolution_reason === null,
  );
  // Complex update by second administrator - reassign to admin2 and change status to resolved
  const complexUpdate =
    await api.functional.discussionBoard.admin.content_flags.update(
      admin2Connection,
      {
        flagId: contentFlag.id,
        body: {
          status: "resolved",
          resolution_reason: RandomGenerator.paragraph({ sentences: 2 }),
          reviewing_admin_id: admin2.id,
        } satisfies IDiscussionBoardContentFlag.IUpdate,
      },
    );
  typia.assert(complexUpdate);
  // Verify complex update
  TestValidator.equals(
    "status should transition to resolved",
    complexUpdate.status,
    "resolved",
  );
  TestValidator.equals(
    "reviewer should be reassigned to admin2",
    complexUpdate.reviewingAdmin?.id,
    admin2.id,
  );
  TestValidator.predicate(
    "resolution reason should be provided",
    complexUpdate.resolution_reason !== null,
  );
  TestValidator.predicate(
    "resolved_at should be set",
    complexUpdate.resolved_at !== null,
  );
  // Verify data integrity
  TestValidator.equals(
    "flag ID should remain consistent",
    complexUpdate.id,
    contentFlag.id,
  );
  TestValidator.equals(
    "reporter should remain consistent",
    complexUpdate.reporter.id,
    user.id,
  );
  TestValidator.equals(
    "flag reason should remain consistent",
    complexUpdate.flag_reason,
    contentFlag.flag_reason,
  );
}
