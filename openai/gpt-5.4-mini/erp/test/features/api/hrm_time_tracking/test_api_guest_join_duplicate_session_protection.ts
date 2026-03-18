import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmTimeTrackingGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingGuest";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_guest_join } from "../../../authorize/authorize_guest_join";
import { authorize_guest_refresh } from "../../../authorize/authorize_guest_refresh";

export async function test_api_guest_join_duplicate_session_protection(
  connection: api.IConnection,
): Promise<void> {
  const guestConnectionA: api.IConnection = { host: connection.host };
  const first = await authorize_guest_join(guestConnectionA, { body: {} });
  typia.assert(first);
  const guestConnectionB: api.IConnection = { host: connection.host };
  const second = await authorize_guest_join(guestConnectionB, { body: {} });
  typia.assert(second);
  TestValidator.equals(
    "guest id should remain consistent across repeated join attempts",
    first.id,
    second.id,
  );
  TestValidator.equals(
    "guest created_at should remain consistent across repeated join attempts",
    first.created_at,
    second.created_at,
  );
  TestValidator.equals(
    "guest deleted_at should remain consistent across repeated join attempts",
    first.deleted_at,
    second.deleted_at,
  );
  TestValidator.equals(
    "access expiration should remain consistent across repeated join attempts",
    first.token.expired_at,
    second.token.expired_at,
  );
  TestValidator.equals(
    "refreshable deadline should remain consistent across repeated join attempts",
    first.token.refreshable_until,
    second.token.refreshable_until,
  );
}
