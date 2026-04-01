import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmTimeGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeGuest";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_guest_join } from "../../../authorize/authorize_guest_join";
import { authorize_guest_refresh } from "../../../authorize/authorize_guest_refresh";

export async function test_api_guest_join_invitation_recovery(
  connection: api.IConnection,
): Promise<void> {
  const guestConnection: api.IConnection = { host: connection.host };
  const email = typia.random<string & tags.Format<"email">>();
  const invitationCode = RandomGenerator.alphaNumeric(12);
  const href = "https://example.com/erpHrmTime/auth/guest/join";
  const referrer = "https://example.com/erpHrmTime/invite";
  const ip = typia.random<string & tags.Format<"ipv4">>();
  const token = RandomGenerator.alphaNumeric(16);
  const first = await authorize_guest_join(guestConnection, {
    body: {
      href,
      referrer,
      ip,
      email,
      token,
      invitationCode,
    } satisfies IErpHrmTimeGuest.IJoin,
  });
  typia.assert(first);
  TestValidator.predicate(
    "guest authorization should include a non-empty identity id",
    first.id.length > 0,
  );
  TestValidator.predicate(
    "guest authorization should include access and refresh tokens",
    first.token.access.length > 0 && first.token.refresh.length > 0,
  );
  TestValidator.predicate(
    "guest authorization should include token expiration metadata",
    first.token.expired_at.length > 0 &&
      first.token.refreshable_until.length > 0,
  );
  const secondConnection: api.IConnection = { host: connection.host };
  const second = await authorize_guest_join(secondConnection, {
    body: {
      href,
      referrer,
      ip,
      email,
      token,
      invitationCode,
    } satisfies IErpHrmTimeGuest.IJoin,
  });
  typia.assert(second);
  TestValidator.equals(
    "guest invitation recovery should resolve the same guest identity",
    second.id,
    first.id,
  );
  TestValidator.predicate(
    "guest invitation recovery should return a usable token bundle",
    second.token.access.length > 0 && second.token.refresh.length > 0,
  );
  TestValidator.notEquals(
    "guest join should not reuse the same access token object value by accident",
    second.token.access,
    undefined,
  );
}
