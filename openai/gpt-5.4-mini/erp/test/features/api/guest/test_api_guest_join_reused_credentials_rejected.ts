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

export async function test_api_guest_join_reused_credentials_rejected(
  connection: api.IConnection,
): Promise<void> {
  const firstConnection: api.IConnection = { host: connection.host };
  const email = typia.random<string & tags.Format<"email">>();
  const href = typia.random<string & tags.Format<"uri">>();
  const referrer = typia.random<string & tags.Format<"uri">>();
  const token = RandomGenerator.alphaNumeric(24);
  const invitationCode = RandomGenerator.alphaNumeric(16);
  const authorized = await authorize_guest_join(firstConnection, {
    body: {
      href,
      referrer,
      email,
      token,
      invitationCode,
    } satisfies IErpHrmTimeGuest.IJoin,
  });
  typia.assert(authorized);
  const reusedConnection: api.IConnection = { host: connection.host };
  await TestValidator.httpError(
    "reused guest join credentials rejected",
    [400, 401, 403],
    async () => {
      await api.functional.erpHrmTime.auth.guest.join(reusedConnection, {
        body: {
          href,
          referrer,
          email,
          token,
          invitationCode,
        } satisfies IErpHrmTimeGuest.IJoin,
      });
    },
  );
  const staleConnection: api.IConnection = { host: connection.host };
  await TestValidator.httpError(
    "stale guest join credentials rejected",
    [400, 401, 403],
    async () => {
      await api.functional.erpHrmTime.auth.guest.join(staleConnection, {
        body: {
          href,
          referrer,
          email: typia.random<string & tags.Format<"email">>(),
          token: `${token}_stale`,
          invitationCode: `${invitationCode}_stale`,
        } satisfies IErpHrmTimeGuest.IJoin,
      });
    },
  );
  const invalidConnection: api.IConnection = { host: connection.host };
  await TestValidator.httpError(
    "invalid temporary access data rejected",
    [400, 401, 403],
    async () => {
      await api.functional.erpHrmTime.auth.guest.join(invalidConnection, {
        body: {
          href,
          referrer,
          email,
          token: RandomGenerator.alphaNumeric(24),
          invitationCode: RandomGenerator.alphaNumeric(16),
        } satisfies IErpHrmTimeGuest.IJoin,
      });
    },
  );
}
