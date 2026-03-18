import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import type { ICommunityPlatformGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformGuest";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformComment";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_guest_join } from "../../../authorize/authorize_guest_join";
import { authorize_guest_refresh } from "../../../authorize/authorize_guest_refresh";

export async function test_api_comment_empty_page_and_post_scope_guard(
  connection: api.IConnection,
): Promise<void> {
  const guestConnection: api.IConnection = { host: connection.host };
  await authorize_guest_join(guestConnection, { body: {} });
  const emptyPage = await api.functional.communityPlatform.guest.comments.index(
    guestConnection,
    {
      body: {
        page: 1,
        limit: 10,
      } satisfies ICommunityPlatformComment.IRequest,
    },
  );
  typia.assert(emptyPage);
  TestValidator.equals("empty comments page data", emptyPage.data.length, 0);
  TestValidator.equals(
    "empty comments page current",
    emptyPage.pagination.current,
    1,
  );
  TestValidator.equals(
    "empty comments page limit",
    emptyPage.pagination.limit,
    10,
  );
  TestValidator.equals(
    "empty comments page records",
    emptyPage.pagination.records,
    0,
  );
  TestValidator.equals(
    "empty comments page pages",
    emptyPage.pagination.pages,
    0,
  );
  await TestValidator.httpError(
    "invalid postId should reject comment browsing",
    [400, 404],
    async () => {
      await api.functional.communityPlatform.guest.comments.index(
        guestConnection,
        {
          body: {
            postId: typia.random<string & tags.Format<"uuid">>(),
            page: 1,
            limit: 10,
          } satisfies ICommunityPlatformComment.IRequest,
        },
      );
    },
  );
}
