import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import { authorize_guest_join } from "../../../authorize/authorize_guest_join";
import { authorize_guest_refresh } from "../../../authorize/authorize_guest_refresh";
export async function test_api_guest_session_refresh(
  connection: api.IConnection,
): Promise<void> {
  // Create new guest session
  const guestJoin = await authorize_guest_join(connection, {
    body: {
      href: "https://example.com",
      referrer: "https://example.com",
    },
  });
  // Refresh the guest session
  const refreshedSession = await authorize_guest_refresh(connection, {
    body: {
      refreshToken: guestJoin.token.refresh,
      href: "https://example.com",
      referrer: "https://example.com",
    },
  });
  // Validate the refreshed session
  typia.assert(refreshedSession);
}
