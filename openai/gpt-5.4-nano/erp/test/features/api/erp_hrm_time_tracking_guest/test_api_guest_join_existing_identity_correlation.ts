import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmTimeTrackingGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTrackingGuest";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_guest_join } from "../../../authorize/authorize_guest_join";
import { authorize_guest_refresh } from "../../../authorize/authorize_guest_refresh";

export async function test_api_guest_join_existing_identity_correlation(
  connection: api.IConnection,
): Promise<void> {
  const guestEmail = typia.random<string & tags.Format<"email">>();
  const guestPassword = typia.random<string & tags.Format<"password">>();
  const body = {
    email: guestEmail,
    password: guestPassword,
  } satisfies IErpHrmTimeTrackingGuest.IJoin;
  const guestJoinConnection1: api.IConnection = { host: connection.host };
  const joined1 = await authorize_guest_join(guestJoinConnection1, { body });
  typia.assert(joined1);
  const guestJoinConnection2: api.IConnection = { host: connection.host };
  const joined2 = await authorize_guest_join(guestJoinConnection2, { body });
  typia.assert(joined2);
  TestValidator.equals(
    "guest identity correlation id should be same across joins",
    joined1.id,
    joined2.id,
  );
  TestValidator.predicate(
    "access token should be non-empty",
    joined1.token.access.length > 0 && joined2.token.access.length > 0,
  );
  TestValidator.predicate(
    "refresh token should be non-empty",
    joined1.token.refresh.length > 0 && joined2.token.refresh.length > 0,
  );
  const expired1 = new Date(joined1.token.expired_at).getTime();
  const refreshable1 = new Date(joined1.token.refreshable_until).getTime();
  const expired2 = new Date(joined2.token.expired_at).getTime();
  const refreshable2 = new Date(joined2.token.refreshable_until).getTime();
  TestValidator.predicate(
    "expired_at and refreshable_until should be valid timestamps",
    Number.isFinite(expired1) &&
      Number.isFinite(refreshable1) &&
      Number.isFinite(expired2) &&
      Number.isFinite(refreshable2),
  );
  TestValidator.predicate(
    "refreshable_until should be >= expired_at",
    refreshable1 >= expired1 && refreshable2 >= expired2,
  );
  const responseJson1 = JSON.stringify(joined1);
  const responseJson2 = JSON.stringify(joined2);
  TestValidator.predicate(
    "response must not contain guest password",
    !responseJson1.includes(guestPassword) &&
      !responseJson2.includes(guestPassword),
  );
}
