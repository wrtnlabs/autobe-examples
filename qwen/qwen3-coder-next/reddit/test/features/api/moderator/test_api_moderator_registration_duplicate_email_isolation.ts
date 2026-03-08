import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditLikeModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeModerator";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_moderator_join } from "../../../authorize/authorize_moderator_join";
import { authorize_moderator_login } from "../../../authorize/authorize_moderator_login";
import { authorize_moderator_refresh } from "../../../authorize/authorize_moderator_refresh";

export async function test_api_moderator_registration_duplicate_email_isolation(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: First moderator registration with test email
  const moderatorConnection1: api.IConnection = { host: connection.host };
  const moderator1 = await authorize_moderator_join(moderatorConnection1, {
    body: {
      email: "test_duplicate@example.com",
      username: "moderator1_" + RandomGenerator.alphaNumeric(4),
      display_name: "Moderator One",
      password: "Password123!",
      bio: null,
      avatar_url: null,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(moderator1);
  // Step 2: Second registration attempt with same email should fail
  const moderatorConnection2: api.IConnection = { host: connection.host };
  await TestValidator.error("duplicate email should be rejected", async () => {
    await authorize_moderator_join(moderatorConnection2, {
      body: {
        email: "test_duplicate@example.com", // Same email as first
        username: "moderator2_" + RandomGenerator.alphaNumeric(4),
        display_name: "Moderator Two",
        password: "Password456!",
        bio: null,
        avatar_url: null,
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      },
    });
  });
}
