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

export async function test_api_guest_post_text_retrieval_success(
  connection: api.IConnection,
): Promise<void> {
  // Scenario: Successfully retrieve full text content of an existing text-type post.
  // 1. Register as a guest user to receive authorization tokens
  const guestJoinConnection: api.IConnection = { host: connection.host };
  const guestAuth = await authorize_guest_join(guestJoinConnection, {
    body: { deviceFingerprint: RandomGenerator.alphaNumeric(32) },
  });
  typia.assert(guestAuth);
  // Prepare authorized connection for guest with access token
  const guestConnection: api.IConnection = { host: connection.host };
  guestConnection.headers = { Authorization: guestAuth.access };
  // 2. For test purpose, simulate or generate a valid postId of text-type post
  // Note: Since no post creation API details are provided, we generate a random UUID
  const postId = typia.random<string & tags.Format<"uuid">>();
  // 3. Request the full text content for the post with postId
  const response =
    await api.functional.communityPlatform.guest.posts.texts.atText(
      guestConnection,
      { postId },
    );
  typia.assert(response);
  // 4. Validate response content is non-empty
  TestValidator.predicate(
    "post content is a non-empty string",
    response.content.length > 0,
  );
  // 5. Validate response postId matches request postId
  TestValidator.equals(
    "postId matches",
    response.communityPlatformPostId,
    postId,
  );
}
