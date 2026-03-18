import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformGuest";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberSession";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformMemberSession";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_guest_join } from "../../../authorize/authorize_guest_join";
import { authorize_guest_refresh } from "../../../authorize/authorize_guest_refresh";

export async function test_api_session_read_only_repeat_access(
  connection: api.IConnection,
): Promise<void> {
  const guestConnection: api.IConnection = { host: connection.host };
  const authorized = await api.functional.communityPlatform.auth.guest.join(
    guestConnection,
    {
      body: {},
    },
  );
  typia.assert(authorized);
  const first =
    await api.functional.communityPlatform.guest.sessions.index(
      guestConnection,
    );
  typia.assert(first);
  const second =
    await api.functional.communityPlatform.guest.sessions.index(
      guestConnection,
    );
  typia.assert(second);
  TestValidator.equals(
    "pagination stays stable",
    first.pagination,
    second.pagination,
  );
  TestValidator.equals("session page stays stable", first.data, second.data);
  if (first.data.length > 0 && second.data.length > 0) {
    TestValidator.equals(
      "session id stays stable",
      first.data[0].id,
      second.data[0].id,
    );
    TestValidator.equals(
      "session member stays stable",
      first.data[0].member,
      second.data[0].member,
    );
    TestValidator.equals(
      "session ip stays stable",
      first.data[0].ip,
      second.data[0].ip,
    );
    TestValidator.equals(
      "session href stays stable",
      first.data[0].href,
      second.data[0].href,
    );
    TestValidator.equals(
      "session referrer stays stable",
      first.data[0].referrer,
      second.data[0].referrer,
    );
    TestValidator.equals(
      "session createdAt stays stable",
      first.data[0].createdAt,
      second.data[0].createdAt,
    );
    TestValidator.equals(
      "session expiredAt stays stable",
      first.data[0].expiredAt,
      second.data[0].expiredAt,
    );
  }
}
