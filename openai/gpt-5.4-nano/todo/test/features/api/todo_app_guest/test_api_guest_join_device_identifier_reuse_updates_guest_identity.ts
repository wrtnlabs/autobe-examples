import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { ITodoAppGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppGuest";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_guest_join } from "../../../authorize/authorize_guest_join";
import { authorize_guest_refresh } from "../../../authorize/authorize_guest_refresh";

export async function test_api_guest_join_device_identifier_reuse_updates_guest_identity(
  connection: api.IConnection,
): Promise<void> {
  // Scenario: Re-joining with the same device_identifier reuses the existing active guest identity and returns valid tokens.
  const guestConnection1: api.IConnection = { host: connection.host };
  const deviceIdentifier = RandomGenerator.alphaNumeric(32);
  const ip1 = typia.random<string & tags.Format<"ipv4">>();
  const href1 = typia.random<string & tags.Format<"uri">>();
  const referrer1 = typia.random<string & tags.Format<"uri">>();
  const authorized1: ITodoAppGuest.IAuthorized = await authorize_guest_join(
    guestConnection1,
    {
      body: {
        device_identifier: deviceIdentifier,
        ip: ip1,
        href: href1,
        referrer: referrer1,
      } satisfies ITodoAppGuest.IJoin,
    },
  );
  typia.assert(authorized1);
  // Re-join with the same device_identifier
  const guestConnection2: api.IConnection = { host: connection.host };
  const ip2 = typia.random<string & tags.Format<"ipv4">>();
  const href2 = typia.random<string & tags.Format<"uri">>();
  const referrer2 = typia.random<string & tags.Format<"uri">>();
  const authorized2: ITodoAppGuest.IAuthorized = await authorize_guest_join(
    guestConnection2,
    {
      body: {
        device_identifier: deviceIdentifier,
        ip: ip2,
        href: href2,
        referrer: referrer2,
      } satisfies ITodoAppGuest.IJoin,
    },
  );
  typia.assert(authorized2);
  const responseTime2 = new Date();
  const time1 = new Date(authorized1.updated_at).getTime();
  const time2 = new Date(authorized2.updated_at).getTime();
  TestValidator.equals(
    "guest identity id should be reused",
    authorized2.id,
    authorized1.id,
  );
  TestValidator.equals(
    "deleted_at should be null on reused identity",
    authorized2.deleted_at,
    null,
  );
  TestValidator.predicate(
    "updated_at should be >= previous updated_at",
    time2 >= time1,
  );
  TestValidator.predicate(
    "access token should be non-empty",
    authorized2.token.access.length > 0,
  );
  TestValidator.predicate(
    "refresh token should be non-empty",
    authorized2.token.refresh.length > 0,
  );
  const expiredAt = new Date(authorized2.token.expired_at).getTime();
  TestValidator.predicate(
    "expired_at should be in the future",
    expiredAt > responseTime2.getTime(),
  );
}
