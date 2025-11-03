import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallReviewModerationQueue } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReviewModerationQueue";

export async function test_api_review_moderation_queue_retrieval_by_id(
  connection: api.IConnection,
) {
  // 1. Admin user registration
  const email = typia.random<string & tags.Format<"email">>();
  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email,
        password: "admin1234", // fixed password for test
        full_name: RandomGenerator.name(),
      } satisfies IShoppingMallAdmin.IJoin,
    });
  typia.assert(admin);

  // 2. Retrieve a review moderation queue entry by ID (use random UUID)
  const id = typia.random<string & tags.Format<"uuid">>();

  // 3. Attempt to get the moderation queue entry
  const moderationQueue: IShoppingMallReviewModerationQueue =
    await api.functional.shoppingMall.admin.reviewModerationQueues.at(
      connection,
      {
        id,
      },
    );

  // 4. Assert the properties and types
  typia.assert(moderationQueue);
  TestValidator.equals(
    "id matches requested id",
    moderationQueue.id,
    id, // We expect to get the same id we requested
  );
  TestValidator.predicate(
    "flagged_reason is non-empty",
    moderationQueue.flagged_reason.length > 0,
  );
  TestValidator.predicate(
    "status is valid",
    ["pending", "approved", "rejected", "needs_changes"].includes(
      moderationQueue.status,
    ),
  );
  if (
    moderationQueue.moderator_notes !== null &&
    moderationQueue.moderator_notes !== undefined
  ) {
    TestValidator.predicate(
      "moderator_notes is a string",
      typeof moderationQueue.moderator_notes === "string",
    );
  }
  TestValidator.predicate(
    "created_at format",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z$/.test(
      moderationQueue.created_at,
    ),
  );
  TestValidator.predicate(
    "updated_at format",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z$/.test(
      moderationQueue.updated_at,
    ),
  );

  // 5. Test error on fetching with invalid id
  await TestValidator.error("error on invalid ID", async () => {
    await api.functional.shoppingMall.admin.reviewModerationQueues.at(
      connection,
      {
        id: "00000000-0000-0000-0000-000000000000" satisfies string &
          tags.Format<"uuid">,
      },
    );
  });
}
