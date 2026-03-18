import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallGuest";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_guest_join } from "../../../authorize/authorize_guest_join";
import { authorize_guest_refresh } from "../../../authorize/authorize_guest_refresh";

export async function test_api_guest_session_details_unauthorized_session_id_not_leaked(
  connection: api.IConnection,
): Promise<void> {
  const guestAConnection: api.IConnection = { host: connection.host };
  const guestBConnection: api.IConnection = { host: connection.host };
  const guestAJoin = await authorize_guest_join(guestAConnection, {
    body: {
      fingerprint: typia.random<string>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IShoppingMallGuest.IJoin,
  });
  typia.assert(guestAJoin);
  const guestBJoin = await authorize_guest_join(guestBConnection, {
    body: {
      fingerprint: typia.random<string>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IShoppingMallGuest.IJoin,
  });
  typia.assert(guestBJoin);
  const nonExistentSessionId = typia.random<string & tags.Format<"uuid">>();
  const guestBTargetError: unknown = await (async () => {
    try {
      await api.functional.shoppingMall.guest.sessions.at(guestAConnection, {
        sessionId: guestBJoin.id,
      });
      return null;
    } catch (err) {
      return err;
    }
  })();
  const nonExistentTargetError: unknown = await (async () => {
    try {
      await api.functional.shoppingMall.guest.sessions.at(guestAConnection, {
        sessionId: nonExistentSessionId,
      });
      return null;
    } catch (err) {
      return err;
    }
  })();
  TestValidator.predicate(
    "guest A must receive an error when inspecting another guest's sessionId",
    () => guestBTargetError !== null,
  );
  TestValidator.predicate(
    "guest A must receive an error for a non-existent sessionId",
    () => nonExistentTargetError !== null,
  );
  // Anti-enumeration: observable outcome should be indistinguishable.
  // Both attempts should fail with HttpError having the same status and message.
  if (
    guestBTargetError instanceof api.HttpError &&
    nonExistentTargetError instanceof api.HttpError
  ) {
    TestValidator.equals(
      "same HTTP status for guest B sessionId vs non-existent sessionId",
      guestBTargetError.status,
      nonExistentTargetError.status,
    );
    TestValidator.equals(
      "same error message to avoid sessionId enumeration",
      guestBTargetError.message,
      nonExistentTargetError.message,
    );
  } else {
    // If error types differ, it's still a leak in terms of observability.
    throw new Error(
      "expected both requests to fail with the same HttpError type",
    );
  }
}
