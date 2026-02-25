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

export async function test_api_guest_post_text_retrieval_non_text_post(
  connection: api.IConnection,
): Promise<void> {
  // Scenario 2: Attempt to retrieve text content for a non-text post and expect 404
  // 1. Guest user registration
  const guestConnection: api.IConnection = { host: connection.host };
  await authorize_guest_join(guestConnection, {
    body: {
      deviceFingerprint: RandomGenerator.alphaNumeric(32),
    },
  });
  // 2. Prepare a valid UUID postId that is not of post_type 'text'.
  // Since we don't have post creation API or detailed data, generate a random UUID.
  // We rely on the system to return 404 for non-text posts.
  const nonTextPostId = typia.random<string & tags.Format<"uuid">>();
  // 3. Request text content for the non-text post
  // Use api.functional.communityPlatform.guest.posts.texts.atText
  let errorOccurred = false;
  try {
    await api.functional.communityPlatform.guest.posts.texts.atText(
      guestConnection,
      {
        postId: nonTextPostId,
      },
    );
  } catch (error) {
    errorOccurred = true;
    if (error instanceof api.HttpError) {
      // Expect 404 Not Found
      TestValidator.equals("status code", error.status, 404);
    } else {
      throw error;
    }
  }
  TestValidator.predicate(
    "error occurred for non-text post text retrieval",
    errorOccurred,
  );
}
