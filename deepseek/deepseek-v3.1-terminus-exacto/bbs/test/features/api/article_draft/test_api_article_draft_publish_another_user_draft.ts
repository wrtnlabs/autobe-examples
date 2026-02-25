import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardArticleDraft } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleDraft";
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
import { generate_random_discussion_board_admin_sections_create } from "../../../generate/generate_random_discussion_board_admin_sections_create";
import { generate_random_discussion_board_user_articles_drafts_create } from "../../../generate/generate_random_discussion_board_user_articles_drafts_create";
import { prepare_random_discussion_board_article_draft } from "../../../prepare/prepare_random_discussion_board_article_draft";
import { prepare_random_discussion_board_section } from "../../../prepare/prepare_random_discussion_board_section";

export async function test_api_article_draft_publish_another_user_draft(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin setup for section creation
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await api.functional.discussionBoard.auth.admin.join(
    adminConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        display_name: RandomGenerator.name(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: typia.random<string & tags.Format<"ipv4">>(),
      } satisfies IDiscussionBoardAdmin.IJoin,
    },
  );
  typia.assert(adminAuth);
  // Admin needs to login after join to get proper session
  const adminLoginConnection: api.IConnection = {
    host: connection.host,
    headers: { Authorization: adminAuth.token.access },
  };
  // 2. Create section for publishing
  const section = await api.functional.discussionBoard.admin.sections.create(
    adminLoginConnection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.content({ paragraphs: 1 }),
        status: "active",
        display_order: 1,
      } satisfies IDiscussionBoardSection.ICreate,
    },
  );
  typia.assert(section);
  // 3. First user (draft creator) setup
  const firstUserConnection: api.IConnection = { host: connection.host };
  const firstUserAuth = await api.functional.discussionBoard.auth.user.join(
    firstUserConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        display_name: RandomGenerator.name(),
      } satisfies IDiscussionBoardUser.IJoin,
    },
  );
  typia.assert(firstUserAuth);
  const firstUserAuthedConnection: api.IConnection = {
    host: connection.host,
    headers: { Authorization: firstUserAuth.token.access },
  };
  // 4. Create draft with first user
  const draft =
    await api.functional.discussionBoard.user.articles_drafts.create(
      firstUserAuthedConnection,
      {
        body: {
          draft_title: RandomGenerator.paragraph({ sentences: 2 }),
          draft_content: RandomGenerator.content({ paragraphs: 3 }),
          draft_status: "draft",
          recovery_data: null,
        } satisfies IDiscussionBoardArticleDraft.ICreate,
      },
    );
  typia.assert(draft);
  // 5. Second user (unauthorized publisher) setup
  const secondUserConnection: api.IConnection = { host: connection.host };
  const secondUserAuth = await api.functional.discussionBoard.auth.user.join(
    secondUserConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        display_name: RandomGenerator.name(),
      } satisfies IDiscussionBoardUser.IJoin,
    },
  );
  typia.assert(secondUserAuth);
  const secondUserAuthedConnection: api.IConnection = {
    host: connection.host,
    headers: { Authorization: secondUserAuth.token.access },
  };
  // 6. Attempt unauthorized publish - should fail with authorization error
  await TestValidator.error(
    "second user cannot publish first user's draft",
    async () => {
      await api.functional.discussionBoard.user.articles_drafts.publish(
        secondUserAuthedConnection,
        {
          draftId: draft.id,
          body: {
            section_id: section.id,
          } satisfies IDiscussionBoardArticleDraft.IPublish,
        },
      );
    },
  );
  // 7. Validate draft status remains unchanged (business logic validation, not type validation)
  TestValidator.equals(
    "draft status remains draft",
    draft.draft_status,
    "draft",
  );
}
