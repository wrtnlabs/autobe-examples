import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardArticleDraft } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleDraft";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import type { IDiscussionBoardSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdmin";
import { prepare_random_discussion_board_article_draft } from "../../../prepare/prepare_random_discussion_board_article_draft";
import { generate_random_discussion_board_super_admin_articles_drafts_create } from "../../../generate/generate_random_discussion_board_super_admin_articles_drafts_create";
import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";

export async function test_api_draft_superadmin_publish_workflow(connection: api.IConnection): Promise<void> {
    // 1. Authenticate as superAdmin
    const superAdminConnection: api.IConnection = { host: connection.host };
    const superAdmin = await authorize_super_admin_join(superAdminConnection, {
        body: {
            email: typia.random<string & tags.Format<"email">>(),
            password: RandomGenerator.alphaNumeric(16),
            href: typia.random<string & tags.Format<"uri">>(),
            referrer: typia.random<string & tags.Format<"uri">>(),
            ip: typia.random<string & tags.Format<"ipv4">>(),
        } satisfies IDiscussionBoardSuperAdmin.IJoin,
    });
    typia.assert(superAdmin);

    // 2. Create a draft in 'draft' status
    const draft = await generate_random_discussion_board_super_admin_articles_drafts_create(superAdminConnection, {
        body: {
            draft_title: RandomGenerator.paragraph({ sentences: 2 }),
            draft_content: RandomGenerator.content({ paragraphs: 3 }),
            draft_status: "draft",
        } satisfies IDiscussionBoardArticleDraft.ICreate,
    });
    typia.assert(draft);

    // 3. Update the draft status to 'published'
    const publishedDraft = await api.functional.discussionBoard.superAdmin.articles_drafts.update(superAdminConnection, {
        draftId: draft.id,
        body: {
            draft_status: "published",
        } satisfies IDiscussionBoardArticleDraft.IUpdate,
    });
    typia.assert(publishedDraft);

    // 4. Validate the published draft
    TestValidator.equals("draft status should be published", publishedDraft.draft_status, "published");
    TestValidator.equals("draft ID should remain the same", publishedDraft.id, draft.id);
    TestValidator.equals("draft title should remain unchanged", publishedDraft.draft_title, draft.draft_title);
    TestValidator.equals("draft content should remain unchanged", publishedDraft.draft_content, draft.draft_content);
    TestValidator.predicate("last_saved_at should be updated", Date.parse(publishedDraft.last_saved_at) >= Date.parse(draft.last_saved_at));
    TestValidator.predicate("draft_updated_at should be more recent", Date.parse(publishedDraft.draft_updated_at) > Date.parse(draft.draft_updated_at));
}