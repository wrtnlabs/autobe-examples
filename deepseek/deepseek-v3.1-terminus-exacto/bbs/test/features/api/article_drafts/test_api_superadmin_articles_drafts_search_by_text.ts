import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardAdministratorDistributionStatistic } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorDistributionStatistic";
import type { IDiscussionBoardAdministratorPromotionRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorPromotionRequest";
import type { IDiscussionBoardArticleDraft } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleDraft";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import type { IDiscussionBoardSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardAdministratorDistributionStatistic } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardAdministratorDistributionStatistic";
import type { IPageIDiscussionBoardAdministratorPromotionRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardAdministratorPromotionRequest";
import type { IPageIDiscussionBoardArticleDraft } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardArticleDraft";
import type { IPageIDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardSection";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";

export async function test_api_superadmin_articles_drafts_search_by_text(
  connection: api.IConnection,
): Promise<void> {
  // Create super admin connection
  const superAdminConnection: api.IConnection = { host: connection.host };
  const authorizedAdmin = await authorize_super_admin_join(
    superAdminConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: typia.random<string & tags.Format<"ipv4">>(),
      } satisfies IDiscussionBoardSuperAdmin.IJoin,
    },
  );
  typia.assert(authorizedAdmin);
  // Test title search
  const titleSearchResponse =
    await api.functional.discussionBoard.superAdmin.articles_drafts.index(
      superAdminConnection,
      {
        body: {
          search_title: "test",
        } satisfies IDiscussionBoardArticleDraft.IRequest,
      },
    );
  typia.assert(titleSearchResponse);
  // Test content search
  const contentSearchResponse =
    await api.functional.discussionBoard.superAdmin.articles_drafts.index(
      superAdminConnection,
      {
        body: {
          search_content: "content",
        } satisfies IDiscussionBoardArticleDraft.IRequest,
      },
    );
  typia.assert(contentSearchResponse);
  // Test default pagination
  const defaultPaginatedResponse =
    await api.functional.discussionBoard.superAdmin.articles_drafts.index(
      superAdminConnection,
      {
        body: {} satisfies IDiscussionBoardArticleDraft.IRequest,
      },
    );
  typia.assert(defaultPaginatedResponse);
  // Validate response structure
  TestValidator.equals(
    "pagination structure exists",
    typeof defaultPaginatedResponse.pagination,
    "object",
  );
  TestValidator.equals(
    "data array exists",
    Array.isArray(defaultPaginatedResponse.data),
    true,
  );
  if (defaultPaginatedResponse.data.length > 0) {
    const draft = defaultPaginatedResponse.data[0];
    TestValidator.predicate("draft has id", typeof draft.id === "string");
    TestValidator.predicate(
      "draft has title",
      typeof draft.draft_title === "string",
    );
    TestValidator.predicate(
      "draft has status",
      typeof draft.draft_status === "string",
    );
    TestValidator.predicate(
      "draft has timestamps",
      typeof draft.last_saved_at === "string",
    );
  }
}
