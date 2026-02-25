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

export async function test_api_content_flag_review_place_under_investigation(
  connection: api.IConnection,
): Promise<void> {
  // 1. Setup administrator account and authentication
  const adminConnection: api.IConnection = { host: connection.host };
  const adminJoin = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(adminJoin);
  // Perform admin login to ensure proper authentication
  const admin = await authorize_admin_login(adminConnection, {
    body: {
      email: adminJoin.email,
      password: RandomGenerator.alphaNumeric(16), // Use same password as join
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(admin);
  // 2. Setup regular user account and authentication
  const userConnection: api.IConnection = { host: connection.host };
  const userJoin = await authorize_user_join(userConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
    },
  });
  typia.assert(userJoin);
  // Perform user login to ensure proper authentication
  const user = await authorize_user_login(userConnection, {
    body: {
      email: userJoin.email,
      password: RandomGenerator.alphaNumeric(16), // Use same password as join
    },
  });
  typia.assert(user);
  // 3. Create content flag as regular user (with null references since we cannot create articles/comments)
  const flag = await generate_random_discussion_board_user_content_flags_create(
    userConnection,
    {
      body: {
        flag_reason: RandomGenerator.paragraph({ sentences: 2 }),
        flagged_article_id: null,
        flagged_comment_id: null,
      },
    },
  );
  typia.assert(flag);
  TestValidator.equals("flag status should be pending", flag.status, "pending");
  // 4. Administrator reviews the flag, placing it under investigation without resolution
  const reviewBody = {
    status: "under_investigation",
    resolution_reason: null,
  } satisfies IDiscussionBoardContentFlag.IReview;
  const reviewedFlag =
    await api.functional.discussionBoard.admin.content_flags.review(
      adminConnection,
      {
        flagId: flag.id,
        body: reviewBody,
      },
    );
  typia.assert(reviewedFlag);
  // 5. Validate review changes
  TestValidator.equals(
    "status should be under_investigation",
    reviewedFlag.status,
    "under_investigation",
  );
  TestValidator.equals(
    "reviewingAdmin should be set",
    reviewedFlag.reviewingAdmin?.id,
    admin.id,
  );
  TestValidator.predicate(
    "resolved_at should remain null",
    reviewedFlag.resolved_at === null,
  );
  TestValidator.equals(
    "resolution_reason should be null",
    reviewedFlag.resolution_reason,
    null,
  );
  TestValidator.notEquals(
    "flag should have updated_at changed",
    reviewedFlag.updated_at,
    flag.updated_at,
  );
}
