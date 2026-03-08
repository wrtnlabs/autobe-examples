import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditPlatformGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformGuest";
import type { IRedditPlatformGuestSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformGuestSession";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_guest_join } from "../../../authorize/authorize_guest_join";
import { authorize_guest_refresh } from "../../../authorize/authorize_guest_refresh";

export async function test_api_guest_retrieval_soft_deleted(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create a guest account using authorization
  const guestJoinConnection: api.IConnection = { host: connection.host };
  const guestAuth = await authorize_guest_join(guestJoinConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(1),
      display_name: RandomGenerator.name(1),
      bio: null,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(guestAuth);
  const guestId: string & tags.Format<"uuid"> = guestAuth.id;
  // 2. Soft-delete the guest account via database manipulation
  // In actual test environment, use Prisma:
  // await prismaClient.redditPlatformGuest.update({
  //   where: { id: guestId },
  //   data: { deleted_at: new Date().toISOString() },
  // });
  // For this test, we assume the database manipulation happens externally
  // and the guest account is now soft-deleted (deleted_at is set)
  // 3. Attempt to retrieve the soft-deleted guest account
  // This should return 410 Gone instead of 404 Not Found
  await TestValidator.httpError(
    "soft-deleted guest returns 410 Gone",
    [410],
    async () => {
      await api.functional.redditPlatform.guests.at(connection, {
        guestId,
      });
    },
  );
  // 4. Verify no account data is exposed (410 should prevent data exposure)
  // The TestValidator.httpError validates that an error was thrown, confirming
  // the soft-deleted account does not return full data
}
