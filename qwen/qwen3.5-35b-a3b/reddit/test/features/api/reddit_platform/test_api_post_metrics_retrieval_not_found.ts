import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditPlatformGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformGuest";
import type { IRedditPlatformPostMetric } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPostMetric";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_guest_join } from "../../../authorize/authorize_guest_join";
import { authorize_guest_refresh } from "../../../authorize/authorize_guest_refresh";

export async function test_api_post_metrics_retrieval_not_found(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create guest session with randomized device fingerprint
  const guestConnection: api.IConnection = { host: connection.host };
  const guest: IRedditPlatformGuest.IAuthorized = await authorize_guest_join(
    guestConnection,
    {
      body: typia.random<IRedditPlatformGuest.IJoin>(),
    },
  );
  typia.assert(guest);
  // Verify guest token is properly set in connection headers
  if (!guestConnection.headers?.Authorization) {
    throw new Error("Guest authorization header not set");
  }
  // 2. Generate a valid UUID that does not exist in the database
  const invalidPostId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // 3. Attempt to retrieve metrics for non-existent post
  // This should return 404 Not Found with appropriate error message
  try {
    const metrics: IRedditPlatformPostMetric =
      await api.functional.redditPlatform.guest.posts.metrics.at(
        guestConnection,
        {
          postId: invalidPostId,
        },
      );
    // Should not reach here for non-existent post
    throw new Error(
      "Expected 404 error for non-existent post, but got successful response",
    );
  } catch (error) {
    // Validate that error is an HttpError with 404 status
    if (!typia.is<api.HttpError>(error)) {
      throw new Error("Expected HttpError for 404 response");
    }
    // Verify HTTP 404 status code
    if (error.status !== 404) {
      throw new Error(`Expected HTTP 404, got status ${error.status}`);
    }
    // Verify error path matches expected endpoint
    if (!error.path.includes("/metrics")) {
      throw new Error("Error path does not include metrics endpoint");
    }
    // Validate error response message indicates post not found
    const errorData = error.toJSON();
    if (
      !errorData.message ||
      typeof errorData.message !== "string" ||
      (errorData.message.toLowerCase().includes("not found") === false &&
        errorData.message.toLowerCase().includes("does not exist") === false &&
        errorData.message.toLowerCase().includes("does not exist") === false)
    ) {
      throw new Error(
        `Error message does not indicate post not found: ${errorData.message}`,
      );
    }
  }
  // 4. Additional validation: ensure no partial metrics data leaked
  // This is implicitly validated by the error handling above,
  // as the try-catch block ensures we don't receive partial data
}
