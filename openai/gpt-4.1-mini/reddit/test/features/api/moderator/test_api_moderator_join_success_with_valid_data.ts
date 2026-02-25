import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_moderator_join } from "../../../authorize/authorize_moderator_join";
import { authorize_moderator_login } from "../../../authorize/authorize_moderator_login";
import { authorize_moderator_refresh } from "../../../authorize/authorize_moderator_refresh";

export async function test_api_moderator_join_success_with_valid_data(
  connection: api.IConnection,
): Promise<void> {
  // Register a new moderator with valid data
  const moderatorConnection: api.IConnection = { host: connection.host };
  const input = {
    email: typia.random<string & tags.Format<"email">>(),
    username: RandomGenerator.name(1),
    displayName: RandomGenerator.name(2),
    bio: RandomGenerator.paragraph({ sentences: 3 }),
    avatarUrl: `https://example.com/avatar/${RandomGenerator.alphabets(10)}.png`,
  } satisfies ICommunityPlatformModerator.IJoin;
  const authorized = await authorize_moderator_join(moderatorConnection, {
    body: input,
  });
  typia.assert(authorized);
  // Check the authorized response contains valid id and tokens
  TestValidator.predicate(
    "moderator ID is uuid",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      authorized.id,
    ),
  );
  TestValidator.predicate(
    "access token is non-empty",
    authorized.token.access.length > 0,
  );
  TestValidator.predicate(
    "refresh token is non-empty",
    authorized.token.refresh.length > 0,
  );
  TestValidator.predicate(
    "expired_at is ISO date-time",
    !isNaN(Date.parse(authorized.token.expired_at)),
  );
  TestValidator.predicate(
    "refreshable_until is ISO date-time",
    !isNaN(Date.parse(authorized.token.refreshable_until)),
  );
  // Attempt to join with the same email to ensure duplicate prevention
  await TestValidator.error("duplicate email registration", async () => {
    await authorize_moderator_join(moderatorConnection, {
      body: {
        email: input.email,
        username: RandomGenerator.name(1), // different username
      },
    });
  });
  // Attempt to join with the same username to ensure duplicate prevention
  await TestValidator.error("duplicate username registration", async () => {
    await authorize_moderator_join(moderatorConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        username: input.username,
      },
    });
  });
}
