import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityBan } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityBan";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformModerationActionBan } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerationActionBan";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformModerationActionBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformModerationActionBan";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_moderation_action_bans_empty_page_when_unlinked(
  connection: api.IConnection,
): Promise<void> {
  /**
   * Validates empty-page semantics for moderation-action ban linkage lookup.
   *
   * Fixture creation APIs for communities, moderation actions, and ban linkages
   * are not available in the provided SDK surface, so this test focuses on
   * response-shape and empty-page behavior using only the authorized admin
   * context and the target endpoint. When the service returns no linked ban
   * targets, the page must be genuinely empty with intact pagination metadata.
   * If any rows are returned by the backing fixture environment, they must stay
   * inside the requested community scope and must not look like synthetic
   * placeholders derived from the moderation action identifier.
   */
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "Admin1234!Admin1234!",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies ICommunityPlatformAdmin.IJoin,
  });
  const communityId = typia.random<string & tags.Format<"uuid">>();
  const moderationActionId = typia.random<string & tags.Format<"uuid">>();
  const body = {
    page: 1,
    limit: 10,
  } satisfies ICommunityPlatformModerationActionBan.IRequest;
  const page =
    await api.functional.communityPlatform.admin.communities.moderationActions.bans.index(
      adminConnection,
      {
        communityId,
        moderationActionId,
        body,
      },
    );
  typia.assert(page);
  TestValidator.predicate(
    "pagination current is non-negative",
    page.pagination.current >= 0,
  );
  TestValidator.predicate(
    "pagination limit is non-negative",
    page.pagination.limit >= 0,
  );
  TestValidator.predicate(
    "pagination records is non-negative",
    page.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages is non-negative",
    page.pagination.pages >= 0,
  );
  if (page.data.length === 0) {
    TestValidator.equals(
      "empty page has zero records",
      page.pagination.records,
      0,
    );
    TestValidator.equals("empty page has zero pages", page.pagination.pages, 0);
  }
  for (const summary of page.data) {
    TestValidator.equals(
      "returned ban remains scoped to requested community",
      summary.communityBan.community.id,
      communityId,
    );
    TestValidator.notEquals(
      "linkage id is not fabricated from moderation action id",
      summary.id,
      moderationActionId,
    );
    TestValidator.notEquals(
      "community ban id is not fabricated from moderation action id",
      summary.communityBan.id,
      moderationActionId,
    );
  }
}
