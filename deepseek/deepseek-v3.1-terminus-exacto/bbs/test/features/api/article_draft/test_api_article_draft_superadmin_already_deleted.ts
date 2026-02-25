import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardArticleDraft } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleDraft";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
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
import { generate_random_discussion_board_super_admin_articles_drafts_create } from "../../../generate/generate_random_discussion_board_super_admin_articles_drafts_create";
import { prepare_random_discussion_board_article_draft } from "../../../prepare/prepare_random_discussion_board_article_draft";

export async function test_api_article_draft_superadmin_already_deleted(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create super admin connection and authorize
  const superAdminConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardSuperAdmin.IJoin,
  });
  // Update connection headers with authorization token
  superAdminConnection.headers = {
    ...superAdminConnection.headers,
    Authorization: `Bearer ${authorized.token.access}`,
  };
  // 2. Create a draft article
  const draft =
    await generate_random_discussion_board_super_admin_articles_drafts_create(
      superAdminConnection,
      {
        body: {
          draft_title: RandomGenerator.paragraph({ sentences: 2 }),
          draft_content: RandomGenerator.content({ paragraphs: 1 }),
          draft_status: "draft",
        } satisfies IDiscussionBoardArticleDraft.ICreate,
      },
    );
  typia.assert(draft);
  // 3. Delete the draft successfully
  await api.functional.discussionBoard.superAdmin.article_drafts.erase(
    superAdminConnection,
    {
      draftId: draft.id,
    },
  );
  // 4. Attempt to delete the same draft again and validate error
  await TestValidator.error(
    "should fail when deleting already-deleted draft",
    async () => {
      await api.functional.discussionBoard.superAdmin.article_drafts.erase(
        superAdminConnection,
        {
          draftId: draft.id,
        },
      );
    },
  );
}
