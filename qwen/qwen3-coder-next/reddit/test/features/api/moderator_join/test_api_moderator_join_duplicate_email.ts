import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformModerator";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_moderator_join } from "../../../authorize/authorize_moderator_join";
import { authorize_moderator_login } from "../../../authorize/authorize_moderator_login";
import { authorize_moderator_refresh } from "../../../authorize/authorize_moderator_refresh";

export async function test_api_moderator_join_duplicate_email(
  connection: api.IConnection,
): Promise<void> {
  // Generate unique email for duplicate test
  const duplicateEmail = typia.random<string & tags.Format<"email">>();
  // Create first moderator with the email
  const moderatorConnection1: api.IConnection = { host: connection.host };
  await authorize_moderator_join(moderatorConnection1, {
    body: {
      email: duplicateEmail,
      password: "1234",
      name: RandomGenerator.name(),
    } satisfies IRedditPlatformModerator.IJoin,
  });
  // Attempt to register second moderator with same email (should fail)
  const moderatorConnection2: api.IConnection = { host: connection.host };
  await TestValidator.error("duplicate email should be rejected", async () => {
    await authorize_moderator_join(moderatorConnection2, {
      body: {
        email: duplicateEmail,
        password: "1234",
        name: RandomGenerator.name(),
      } satisfies IRedditPlatformModerator.IJoin,
    });
  });
}
