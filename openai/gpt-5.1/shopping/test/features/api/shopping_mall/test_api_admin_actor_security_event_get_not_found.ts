import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallActorSecurityEvent } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallActorSecurityEvent";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";

export async function test_api_admin_actor_security_event_get_not_found(
  connection: api.IConnection,
) {
  // 1. Join an admin to obtain an authenticated admin context so that
  // the actor security event detail endpoint can be accessed with a
  // valid admin token.
  const joinBody = typia.random<IShoppingMallAdminJoin.ICreate>();

  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: joinBody,
    });
  typia.assert(admin);
  typia.assert<IAuthorizationToken>(admin.token);

  // 2. Generate a random UUID that is extremely unlikely to match any
  // existing security event. We intentionally do not create a
  // corresponding event record so that the ID should represent a
  // non-existent resource.
  const missingSecurityEventId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();

  // 3. Call the actorSecurityEvents.at endpoint with the non-existent
  // id and verify that the call fails with some error instead of
  // returning a valid IShoppingMallActorSecurityEvent. Per global
  // rules, we must not assert specific HTTP status codes, so we only
  // check that an error is thrown for this request.
  await TestValidator.error(
    "non-existent actor security event must not be returned",
    async () => {
      const result: IShoppingMallActorSecurityEvent =
        await api.functional.shoppingMall.admin.actorSecurityEvents.at(
          connection,
          {
            securityEventId: missingSecurityEventId,
          },
        );

      // If the call unexpectedly succeeds, typia.assert will still
      // validate the response shape, but TestValidator.error will
      // treat the absence of an error as a failure for this test.
      typia.assert<IShoppingMallActorSecurityEvent>(result);
      return result;
    },
  );
}
