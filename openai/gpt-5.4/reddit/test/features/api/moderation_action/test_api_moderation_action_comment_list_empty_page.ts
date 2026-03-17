import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformModerationActionComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerationActionComment";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformProfile";
import type { ICommunityPlatformProfileFile } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformProfileFile";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformModerationActionComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformModerationActionComment";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_moderation_action_comment_list_empty_page(
  connection: api.IConnection,
): Promise<void> {
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  const communityId = "11111111-1111-1111-1111-111111111111" as string &
    tags.Format<"uuid">;
  const moderationActionId = "22222222-2222-2222-2222-222222222222" as string &
    tags.Format<"uuid">;
  const body = {
    page: 1,
    limit: 10,
  } satisfies ICommunityPlatformModerationActionComment.IRequest;
  const page =
    await api.functional.communityPlatform.member.communities.moderationActions.comments.index(
      memberConnection,
      {
        communityId,
        moderationActionId,
        body,
      },
    );
  typia.assert<IPageICommunityPlatformModerationActionComment.ISummary>(page);
  TestValidator.equals(
    "returns no linked comment targets",
    page.data.length,
    0,
  );
  TestValidator.equals(
    "preserves requested page number",
    page.pagination.current,
    body.page,
  );
  TestValidator.equals(
    "preserves requested page size",
    page.pagination.limit,
    body.limit,
  );
  TestValidator.equals(
    "reports zero matching records",
    page.pagination.records,
    0,
  );
  TestValidator.equals(
    "reports zero total pages for empty result",
    page.pagination.pages,
    0,
  );
}
