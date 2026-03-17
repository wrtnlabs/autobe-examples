import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformGuest";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_guest_join } from "../../../authorize/authorize_guest_join";
import { authorize_guest_refresh } from "../../../authorize/authorize_guest_refresh";

export async function test_api_guest_join_returning_identity_continuity(
  connection: api.IConnection,
): Promise<void> {
  const guestConnection: api.IConnection = { host: connection.host };
  const joinBody = {
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
    ip: typia.random<string & tags.Format<"ipv4">>(),
  } satisfies ICommunityPlatformGuest.IJoin;
  const first: ICommunityPlatformGuest.IAuthorized = await authorize_guest_join(
    guestConnection,
    {
      body: joinBody,
    },
  );
  typia.assert(first);
  const firstToken: IAuthorizationToken = first.token;
  const second: ICommunityPlatformGuest.IAuthorized =
    await authorize_guest_join(guestConnection, {
      body: joinBody,
    });
  typia.assert(second);
  const secondToken: IAuthorizationToken = second.token;
  TestValidator.equals("stable guest id is reused", second.id, first.id);
  TestValidator.equals(
    "stable guest key is reused",
    second.guest_key,
    first.guest_key,
  );
  TestValidator.equals(
    "guest created_at remains stable",
    second.created_at,
    first.created_at,
  );
  TestValidator.equals("guest remains active", second.deleted_at, null);
  TestValidator.notEquals(
    "new access token is issued for a new session",
    secondToken.access,
    firstToken.access,
  );
  TestValidator.notEquals(
    "new refresh token is issued for a new session",
    secondToken.refresh,
    firstToken.refresh,
  );
  TestValidator.notEquals(
    "updated_at reflects continued activity",
    second.updated_at,
    first.updated_at,
  );
  TestValidator.predicate(
    "updated_at does not go backwards",
    new Date(second.updated_at).getTime() >=
      new Date(first.updated_at).getTime(),
  );
}
