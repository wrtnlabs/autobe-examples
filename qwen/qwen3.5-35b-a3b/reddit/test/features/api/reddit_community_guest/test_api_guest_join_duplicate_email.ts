import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCommunityGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityGuest";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_guest_join } from "../../../authorize/authorize_guest_join";
import { authorize_guest_refresh } from "../../../authorize/authorize_guest_refresh";

export async function test_api_guest_join_duplicate_email(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create first guest account with random email
  const email = typia.random<string & tags.Format<"email">>();
  const firstConnection: api.IConnection = { host: connection.host };
  const firstGuest = await authorize_guest_join(firstConnection, {
    body: {
      email,
      password: typia.random<string & tags.Format<"password">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditCommunityGuest.IJoin,
  });
  typia.assert(firstGuest);
  // Step 2: Create second connection for duplicate registration attempt
  const secondConnection: api.IConnection = { host: connection.host };
  // Step 3: Attempt duplicate registration with same email - should be rejected
  await TestValidator.error(
    "duplicate email registration rejected",
    async () => {
      await authorize_guest_join(secondConnection, {
        body: {
          email,
          password: typia.random<string & tags.Format<"password">>(),
          href: typia.random<string & tags.Format<"uri">>(),
          referrer: typia.random<string & tags.Format<"uri">>(),
        } satisfies IRedditCommunityGuest.IJoin,
      });
    },
  );
  // Step 4: Verify first guest account structure and data integrity
  TestValidator.predicate(
    "first guest has valid UUID ID",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      firstGuest.id,
    ),
  );
  TestValidator.equals(
    "first guest email matches input",
    firstGuest.email,
    email,
  );
  TestValidator.predicate(
    "first guest has creation timestamp",
    firstGuest.created_at !== undefined &&
      new Date(firstGuest.created_at) instanceof Date,
  );
  TestValidator.predicate(
    "first guest has access token with expiration",
    firstGuest.token.expired_at !== undefined &&
      new Date(firstGuest.token.expired_at) instanceof Date,
  );
  TestValidator.predicate(
    "first guest has refreshable until timestamp",
    firstGuest.token.refreshable_until !== undefined &&
      new Date(firstGuest.token.refreshable_until) instanceof Date,
  );
}
