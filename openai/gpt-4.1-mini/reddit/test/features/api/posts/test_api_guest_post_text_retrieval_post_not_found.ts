import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformGuest";
import type { ICommunityPlatformPostText } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostText";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_guest_join } from "../../../authorize/authorize_guest_join";
import { authorize_guest_refresh } from "../../../authorize/authorize_guest_refresh";

export async function test_api_guest_post_text_retrieval_post_not_found(
  connection: api.IConnection,
): Promise<void> {
  // 1. Guest user registration
  const guestConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_guest_join(guestConnection, {});
  guestConnection.headers = {
    Authorization: authorized.token.access,
  };
  // 2. Use a random UUID for postId that does not exist
  const invalidPostId = typia.random<string & tags.Format<"uuid">>();
  // 3. Attempt to retrieve post text content for the non-existent post
  await TestValidator.httpError(
    "post text retrieval for non-existent post returns 404",
    404,
    async () => {
      await api.functional.communityPlatform.guest.posts.texts.atText(
        guestConnection,
        {
          postId: invalidPostId,
        },
      );
    },
  );
}
