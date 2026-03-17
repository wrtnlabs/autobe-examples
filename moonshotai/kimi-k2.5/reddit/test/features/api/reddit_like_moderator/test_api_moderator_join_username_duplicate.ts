import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditLikeAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeAttachment";
import type { IRedditLikeCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunity";
import type { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import type { IRedditLikeModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeModerator";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { authorize_moderator_join } from "../../../authorize/authorize_moderator_join";
import { authorize_moderator_login } from "../../../authorize/authorize_moderator_login";
import { authorize_moderator_refresh } from "../../../authorize/authorize_moderator_refresh";

export async function test_api_moderator_join_username_duplicate(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Register a member first with a unique username
  const memberConnection: api.IConnection = { host: connection.host };
  const registeredMember = await authorize_member_join(memberConnection, {
    body: {
      username: typia.random<string & tags.MinLength<3> & tags.MaxLength<30>>(),
    },
  });
  typia.assert(registeredMember);
  // Capture the username that was successfully registered
  const occupiedUsername = registeredMember.username;
  // Step 2: Attempt to register as moderator with the same username
  // This should fail because the username is already taken
  const moderatorConnection: api.IConnection = { host: connection.host };
  await TestValidator.httpError(
    "moderator join with duplicate username should fail",
    409,
    async () => {
      await api.functional.redditLike.auth.moderator.join(moderatorConnection, {
        body: {
          email: typia.random<string & tags.Format<"email">>(),
          username: occupiedUsername,
          password: RandomGenerator.alphaNumeric(16),
          href: typia.random<string & tags.Format<"uri">>(),
          referrer: typia.random<string & tags.Format<"uri">>(),
          ip: typia.random<(string & tags.Format<"ipv4">) | null>(),
        } satisfies IRedditLikeModerator.IJoin,
      });
    },
  );
}
