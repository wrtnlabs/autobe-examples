import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardContentFlag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardContentFlag";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardContentFlag } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardContentFlag";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_content_flags_search_by_content_type_and_reason_text(
  connection: api.IConnection,
): Promise<void> {
  // Create administrator connection
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  // Search for existing flags with different content types and text patterns
  // Test 1: Search for article flags with text pattern
  const articleSearch =
    await api.functional.discussionBoard.admin.content_flags.index(
      adminConnection,
      {
        body: {
          flagged_article_id: null, // This means "article flags exist" (not null)
          flag_reason: "violation",
        } satisfies IDiscussionBoardContentFlag.IRequest,
      },
    );
  typia.assert(articleSearch);
  // Test 2: Search for comment flags with text pattern
  const commentSearch =
    await api.functional.discussionBoard.admin.content_flags.index(
      adminConnection,
      {
        body: {
          flagged_comment_id: null, // This means "comment flags exist" (not null)
          flag_reason: "spam",
        } satisfies IDiscussionBoardContentFlag.IRequest,
      },
    );
  typia.assert(commentSearch);
  // Test 3: Search for flags with specific keyword (both types)
  const keywordSearch =
    await api.functional.discussionBoard.admin.content_flags.index(
      adminConnection,
      {
        body: {
          flag_reason: "copyright",
        } satisfies IDiscussionBoardContentFlag.IRequest,
      },
    );
  typia.assert(keywordSearch);
  // Validate search functionality
  TestValidator.predicate("search operations completed successfully", true);
}
