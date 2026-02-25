import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditGuest";
import type { IRedditGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditGuest";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_guest_join } from "../../../authorize/authorize_guest_join";
import { authorize_guest_refresh } from "../../../authorize/authorize_guest_refresh";

export async function test_api_guest_list_with_custom_limit(
  connection: api.IConnection,
): Promise<void> {
  const guestConnection: api.IConnection = { host: connection.host };
  await authorize_guest_join(guestConnection, {
    body: typia.random<IRedditGuest.IJoin>(),
  });
  const output: IPageIRedditGuest.ISummary =
    await api.functional.reddit.guest.guests.index(guestConnection, {
      body: {
        page: 1,
        limit: 5,
      },
    });
  typia.assert(output);
  TestValidator.equals("data length", output.data.length, 5);
  TestValidator.equals("pagination current", output.pagination.current, 1);
  TestValidator.equals("pagination limit", output.pagination.limit, 5);
}
