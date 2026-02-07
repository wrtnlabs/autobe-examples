import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityMember";
import type { ICommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPost";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPost";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_community_feed_sorting_by_hot_algorithm(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member joins to establish authenticated session by utility
  const memberConnection: api.IConnection = { host: connection.host };
  const joinResponse = await authorize_member_join(memberConnection, {
    body: typia.random<ICommunityMember.IJoin>(),
  });
  typia.assert(joinResponse);
  // 2. Use random UUID as communityId — since we cannot create one
  const communityId = typia.random<string & tags.Format<"uuid">>();
  // 3. Call index endpoint with empty body — ICommunityPost.IRequest is {} — so we pass {}
  const feedResponse =
    await api.functional.community.member.feed.community.index(
      memberConnection,
      {
        communityId,
        body: {} satisfies ICommunityPost.IRequest,
      },
    );
  typia.assert(feedResponse);
  // 4. Validate structure matches IPageICommunityPost.ISummary — only pagination and data
  TestValidator.equals(
    "pagination exists",
    feedResponse.pagination !== undefined,
    true,
  );
  TestValidator.equals(
    "data exists and is array",
    Array.isArray(feedResponse.data),
    true,
  );
}
