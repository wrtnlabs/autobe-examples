import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallReviewSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReviewSnapshot";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_review_snapshot_retrieval_scenarios(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create actor-specific connection (guest or common user)
  const userConnection: api.IConnection = { host: connection.host };
  // 2. Generate a random UUID for id; note: no guarantee it exists in backend
  const validId = typia.random<string & tags.Format<"uuid">>();
  // 3. Test retrieving a snapshot by its id
  // Since there is no API to create review snapshot, this might result in 404 normally
  try {
    const snapshot = await api.functional.shoppingMall.reviewSnapshots.at(
      userConnection,
      { id: validId },
    );
    typia.assert(snapshot);
    // Response validated entirely by typia.assert.
    // IShoppingMallReviewSnapshot is empty type here, so no further property assertions.
  } catch (error) {
    // Accept 404 not found or 403 forbidden errors
    if (error instanceof api.HttpError) {
      await TestValidator.httpError(
        "fetch review snapshot - non existent id",
        [404, 403],
        async () => {
          throw error;
        },
      );
    } else throw error;
  }
  // 4. Test retrieving a non-existent snapshot (using reserved UUID)
  const nonExistentId =
    "00000000-0000-0000-0000-000000000000" satisfies string &
      tags.Format<"uuid">;
  await TestValidator.httpError(
    "fetch review snapshot - non existent id",
    404,
    async () => {
      await api.functional.shoppingMall.reviewSnapshots.at(userConnection, {
        id: nonExistentId,
      });
    },
  );
  // 5. Test unauthorized access scenario
  // AuthorizationActor is null; likely open or common auth
  // Simulate unauthorized access by omitting authorization headers entirely
  const noAuthConnection: api.IConnection = {
    host: connection.host,
  };
  await TestValidator.httpError(
    "fetch review snapshot - unauthorized",
    403,
    async () => {
      await api.functional.shoppingMall.reviewSnapshots.at(noAuthConnection, {
        id: validId,
      });
    },
  );
}
