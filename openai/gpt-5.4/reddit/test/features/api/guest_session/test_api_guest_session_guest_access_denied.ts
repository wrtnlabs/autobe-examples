import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformGuest";
import type { ICommunityPlatformGuestSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformGuestSession";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformGuestSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformGuestSession";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_guest_session_guest_access_denied(
  connection: api.IConnection,
): Promise<void> {
  const guestConnection: api.IConnection = {
    host: connection.host,
  };
  const body = {} satisfies ICommunityPlatformGuestSession.IRequest;
  await TestValidator.httpError(
    "guest access to guest session list is denied",
    [401, 403],
    async () => {
      await api.functional.communityPlatform.guestSessions.index(
        guestConnection,
        {
          body,
        },
      );
    },
  );
}
