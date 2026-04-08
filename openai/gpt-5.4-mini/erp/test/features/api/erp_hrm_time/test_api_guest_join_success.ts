import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmTimeGuestSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeGuestSession";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_guest_join } from "../../../authorize/authorize_guest_join";
import { authorize_guest_refresh } from "../../../authorize/authorize_guest_refresh";

export async function test_api_guest_join_success(
  connection: api.IConnection,
): Promise<void> {
  const guestConnection: api.IConnection = { host: connection.host };
  const body = {
    href: "https://example.com/guest/join",
    referrer: "https://example.com/guest/landing",
    ip: null,
  } satisfies IErpHrmTimeGuestSession.IJoin;
  const authorized = await authorize_guest_join(guestConnection, { body });
  typia.assert(authorized);
  TestValidator.predicate(
    "access token should be non-empty",
    authorized.access.length > 0,
  );
  TestValidator.predicate(
    "refresh token should be non-empty",
    authorized.refresh.length > 0,
  );
  TestValidator.predicate(
    "expiredAt should be a valid timestamp",
    !Number.isNaN(Date.parse(authorized.expiredAt)),
  );
  TestValidator.predicate(
    "token access should be non-empty",
    authorized.token.access.length > 0,
  );
  TestValidator.predicate(
    "token refresh should be non-empty",
    authorized.token.refresh.length > 0,
  );
  TestValidator.predicate(
    "token expired_at should be a valid timestamp",
    !Number.isNaN(Date.parse(authorized.token.expired_at)),
  );
  TestValidator.predicate(
    "token refreshable_until should be a valid timestamp",
    !Number.isNaN(Date.parse(authorized.token.refreshable_until)),
  );
  const secondGuestConnection: api.IConnection = { host: connection.host };
  const secondAuthorized = await authorize_guest_join(secondGuestConnection, {
    body: {
      href: "https://example.com/guest/join/second",
      referrer: "https://example.com/guest/landing/second",
      ip: null,
    } satisfies IErpHrmTimeGuestSession.IJoin,
  });
  typia.assert(secondAuthorized);
  TestValidator.predicate(
    "second guest join should also issue an access token",
    secondAuthorized.access.length > 0,
  );
  TestValidator.predicate(
    "second guest join should also issue a refresh token",
    secondAuthorized.refresh.length > 0,
  );
  TestValidator.notEquals(
    "two guest join responses should not be the same object reference",
    authorized,
    secondAuthorized,
  );
}
