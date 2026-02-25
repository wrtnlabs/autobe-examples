import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditFeedPreference } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditFeedPreference";
import type { IRedditFeed } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditFeed";
import type { IRedditFeedPreference } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditFeedPreference";
import type { IRedditFeedSortingOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditFeedSortingOption";
import type { IRedditMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_preferences_update_home_hot(
  connection: api.IConnection,
): Promise<void> {
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: typia.random<IRedditMember.IJoin>(),
  });
  const feedId = typia.random<string & tags.Format<"uuid">>();
  const sortOrderId = typia.random<string & tags.Format<"uuid">>();
  const preferenceResponse =
    await api.functional.reddit.member.preferences.index(memberConnection, {
      body: {
        feed_id: feedId,
        sort_order_id: sortOrderId,
      } satisfies IRedditFeedPreference.IRequest,
    });
  typia.assert(preferenceResponse);
}
