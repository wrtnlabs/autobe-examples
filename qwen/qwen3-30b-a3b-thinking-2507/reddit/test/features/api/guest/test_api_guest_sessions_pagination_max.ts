import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditMemberSession";
import type { IRedditGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditGuest";
import type { IRedditMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditMember";
import type { IRedditMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditMemberSession";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_guest_join } from "../../../authorize/authorize_guest_join";
import { authorize_guest_refresh } from "../../../authorize/authorize_guest_refresh";

export async function test_api_guest_sessions_pagination_max(
  connection: api.IConnection,
): Promise<void> {
  // 1. Guest setup
  const guestConnection = { host: connection.host };
  await authorize_guest_join(guestConnection, {
    body: {
      device_id: typia.random<string & tags.Format<"uuid">>(),
      href: "https://example.com",
      referrer: "https://referrer.com",
    } satisfies IRedditGuest.IJoin,
  });
  // 2. Call the index endpoint
  const response = await api.functional.reddit.guest.sessions.index(
    guestConnection,
    {
      body: {
        limit: 100,
      } satisfies IRedditMemberSession.IRequest,
    },
  );
  typia.assert(response);
  // 3. Validate response
  TestValidator.equals("pagination limit", response.pagination.limit, 100);
  TestValidator.equals("data count", response.data.length, 100);
  TestValidator.equals("pagination current", response.pagination.current, 1);
}
