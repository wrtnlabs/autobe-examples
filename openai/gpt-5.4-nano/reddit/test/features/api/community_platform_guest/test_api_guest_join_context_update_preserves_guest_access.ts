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

export async function test_api_guest_join_context_update_preserves_guest_access(
  connection: api.IConnection,
): Promise<void> {
  const device_fingerprint = typia.random<string>() satisfies string;
  const hrefA: string & tags.Format<"uri"> = typia.random<
    string & tags.Format<"uri">
  >();
  const referrerA: string & tags.Format<"uri"> = typia.random<
    string & tags.Format<"uri">
  >();
  const ipA: string & tags.Format<"ipv4"> = typia.random<
    string & tags.Format<"ipv4">
  >();
  const hrefB: string & tags.Format<"uri"> = typia.random<
    string & tags.Format<"uri">
  >();
  const referrerB: string & tags.Format<"uri"> = typia.random<
    string & tags.Format<"uri">
  >();
  const ipB: string & tags.Format<"ipv4"> = typia.random<
    string & tags.Format<"ipv4">
  >();
  const guestConnectionA: api.IConnection = { host: connection.host };
  const authorizedA = await authorize_guest_join(guestConnectionA, {
    body: {
      device_fingerprint,
      ip: ipA,
      href: hrefA,
      referrer: referrerA,
    } satisfies ICommunityPlatformGuest.IJoin,
  });
  typia.assert(authorizedA);
  const guestConnectionB: api.IConnection = { host: connection.host };
  const authorizedB = await authorize_guest_join(guestConnectionB, {
    body: {
      device_fingerprint,
      ip: ipB,
      href: hrefB,
      referrer: referrerB,
    } satisfies ICommunityPlatformGuest.IJoin,
  });
  typia.assert(authorizedB);
  TestValidator.predicate(
    "access_token A is non-empty",
    authorizedA.access_token.length > 0,
  );
  TestValidator.predicate(
    "refresh_token A is non-empty",
    authorizedA.refresh_token.length > 0,
  );
  TestValidator.predicate("token A exists", authorizedA.token !== undefined);
  TestValidator.predicate(
    "access_token B is non-empty",
    authorizedB.access_token.length > 0,
  );
  TestValidator.predicate(
    "refresh_token B is non-empty",
    authorizedB.refresh_token.length > 0,
  );
  TestValidator.predicate("token B exists", authorizedB.token !== undefined);
  TestValidator.equals(
    "device_fingerprint preserved (A)",
    authorizedA.device_fingerprint,
    device_fingerprint,
  );
  TestValidator.equals(
    "device_fingerprint preserved (B)",
    authorizedB.device_fingerprint,
    device_fingerprint,
  );
  TestValidator.equals(
    "deleted_at remains null (A)",
    authorizedA.deleted_at,
    null,
  );
  TestValidator.equals(
    "deleted_at remains null (B)",
    authorizedB.deleted_at,
    null,
  );
  TestValidator.predicate("id A is non-empty", authorizedA.id.length > 0);
  TestValidator.predicate("id B is non-empty", authorizedB.id.length > 0);
  TestValidator.predicate(
    "created_at <= updated_at (A)",
    authorizedA.created_at <= authorizedA.updated_at,
  );
  TestValidator.predicate(
    "created_at <= updated_at (B)",
    authorizedB.created_at <= authorizedB.updated_at,
  );
}
