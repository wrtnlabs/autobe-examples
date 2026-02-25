import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticleDraft } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleDraft";
import type { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";
import { generate_random_discussion_board_user_articles_drafts_create } from "../../../generate/generate_random_discussion_board_user_articles_drafts_create";
import { prepare_random_discussion_board_article_draft } from "../../../prepare/prepare_random_discussion_board_article_draft";

export async function test_api_article_draft_creation_with_recovery_data(
  connection: api.IConnection,
): Promise<void> {
  // Create user connection and register
  const userConnection: api.IConnection = { host: connection.host };
  const user = await authorize_user_join(userConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
    } satisfies IDiscussionBoardUser.IJoin,
  });
  typia.assert(user);
  // Create article draft with recovery data
  const draft =
    await generate_random_discussion_board_user_articles_drafts_create(
      userConnection,
      {
        body: {
          draft_title: RandomGenerator.paragraph({ sentences: 2 }),
          draft_content: RandomGenerator.content({ paragraphs: 3 }),
          draft_status: "draft",
          recovery_data: {
            cursor_position: "100",
            last_edit: new Date().toISOString(),
            auto_save_count: "5",
          },
        } satisfies IDiscussionBoardArticleDraft.ICreate,
      },
    );
  typia.assert(draft);
  // Validate response structure
  await TestValidator.predicate(
    "draft status is draft",
    () => draft.draft_status === "draft",
  );
  await TestValidator.predicate("has valid UUID", () =>
    /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      draft.id,
    ),
  );
  await TestValidator.predicate(
    "has draft_created_at timestamp",
    () => !isNaN(new Date(draft.draft_created_at).getTime()),
  );
  await TestValidator.predicate(
    "has draft_updated_at timestamp",
    () => !isNaN(new Date(draft.draft_updated_at).getTime()),
  );
  await TestValidator.predicate(
    "has last_saved_at timestamp",
    () => !isNaN(new Date(draft.last_saved_at).getTime()),
  );
  await TestValidator.equals(
    "draft_deleted_at is null for new draft",
    draft.draft_deleted_at,
    null,
  );
}
