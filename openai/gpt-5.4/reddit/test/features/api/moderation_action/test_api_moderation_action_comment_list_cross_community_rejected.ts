import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import type { ICommunityPlatformModerationActionComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerationActionComment";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformModerationActionComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformModerationActionComment";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_moderation_action_comment_list_cross_community_rejected(
  connection: api.IConnection,
): Promise<void> {
  const adminConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_admin_join(adminConnection, {});
  typia.assert(authorized);
  const body = {
    search: RandomGenerator.paragraph({ sentences: 2 }),
    status: RandomGenerator.alphabets(8),
    isDeleted: false,
    linkCreatedAtFrom: new Date(0).toISOString(),
    linkCreatedAtTo: new Date().toISOString(),
    commentCreatedAtFrom: new Date(0).toISOString(),
    commentCreatedAtTo: new Date().toISOString(),
    sort: "created_at_desc",
    page: 1,
    limit: 10,
  } satisfies ICommunityPlatformModerationActionComment.IRequest;
  await TestValidator.httpError(
    "cross-community moderation action comment listing is rejected",
    [401, 403, 404],
    async () => {
      await api.functional.communityPlatform.admin.communities.moderationActions.comments.index(
        adminConnection,
        {
          communityId: typia.random<string & tags.Format<"uuid">>(),
          moderationActionId: typia.random<string & tags.Format<"uuid">>(),
          body,
        },
      );
    },
  );
}
