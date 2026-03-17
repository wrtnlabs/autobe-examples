import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityGuest";
import type { ICommunityMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityMemberSession";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityMemberSession";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_guest_join } from "../../../authorize/authorize_guest_join";
import { authorize_guest_refresh } from "../../../authorize/authorize_guest_refresh";

export async function test_api_guest_sessions_list_default_pagination(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create a guest-specific connection
  const guestConnection: api.IConnection = { host: connection.host };
  // 2. Establish guest identity via authorize_guest_join utility
  //    This sets guestConnection.headers.Authorization internally
  const authorized = await authorize_guest_join(guestConnection, {
    body: {
      fingerprint: RandomGenerator.alphaNumeric(32),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies ICommunityGuest.IJoin,
  });
  typia.assert(authorized);
  // 3. Call PATCH /community/guest/sessions with empty request body (no filters)
  const result = await api.functional.community.guest.sessions.index(
    guestConnection,
    {
      body: {} satisfies ICommunityMemberSession.IRequest,
    },
  );
  typia.assert(result);
  // 4. Validate pagination defaults
  TestValidator.equals("default page is 1", result.pagination.current, 1);
  TestValidator.equals("default limit is 20", result.pagination.limit, 20);
  TestValidator.predicate("total records >= 1", result.pagination.records >= 1);
  TestValidator.predicate("total pages >= 1", result.pagination.pages >= 1);
  // 5. Validate data array has at least one session (the just-created one)
  TestValidator.predicate(
    "data array has at least one session",
    result.data.length >= 1,
  );
  // 6. Validate sessions are sorted by created_at DESC (most recent first)
  if (result.data.length > 1) {
    for (let i = 0; i < result.data.length - 1; i++) {
      const current = result.data[i]!;
      const next = result.data[i + 1]!;
      TestValidator.predicate(
        "sessions sorted by created_at DESC",
        new Date(current.created_at).getTime() >=
          new Date(next.created_at).getTime(),
      );
    }
  }
}
