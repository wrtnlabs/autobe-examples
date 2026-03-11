import api from "@ORGANIZATION/PROJECT-api";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_seller_account_data_integrity(
  connection: api.IConnection,
): Promise<void> {
  // 1. Setup admin connection for test
  const adminConnection: api.IConnection = { host: connection.host };
  // 2. Generate random seller data for testing
  const sellerData = ArrayUtil.repeat(5, () => {
    const sellerId = typia.random<string & tags.Format<"uuid">>();
    const email = typia.random<string & tags.Format<"email">>();
    const createdAt = new Date().toISOString();
    const updatedAt = createdAt;
    const status: "pending" | "approved" | "rejected" = RandomGenerator.pick([
      "pending",
      "approved",
      "rejected",
    ] as const);
    return {
      id: sellerId,
      email,
      approval_status: status,
      rejection_reason:
        status === "rejected" ? "Documentation incomplete" : null,
      is_suspended: RandomGenerator.pick([true, false]),
      is_banned: RandomGenerator.pick([true, false]),
      created_at: createdAt,
      updated_at: updatedAt,
      deleted_at: undefined,
    } as IEcommerceMallSeller;
  });
  // 3. Test data integrity for each seller
  await ArrayUtil.asyncForEach(sellerData, async (seller) => {
    const sellerConnection: api.IConnection = { host: connection.host };
    // Retrieve seller information
    const retrieved: IEcommerceMallSeller =
      await api.functional.ecommerceMall.sellers.at(sellerConnection, {
        sellerId: seller.id,
      });
    typia.assert(retrieved);
    // 4. Validate approval_status enum values
    TestValidator.predicate(
      "approval_status is valid enum",
      retrieved.approval_status === "pending" ||
        retrieved.approval_status === "approved" ||
        retrieved.approval_status === "rejected",
    );
    // 5. Validate rejection_reason logic
    if (retrieved.approval_status !== "rejected") {
      TestValidator.equals(
        "rejection_reason null when not rejected",
        retrieved.rejection_reason,
        null,
      );
    } else {
      TestValidator.predicate(
        "rejection_reason exists when rejected",
        retrieved.rejection_reason !== null &&
          retrieved.rejection_reason !== undefined &&
          retrieved.rejection_reason !== "",
      );
    }
    // 6. Validate ISO datetime formats
    TestValidator.predicate(
      "created_at is valid ISO datetime",
      !Number.isNaN(Date.parse(retrieved.created_at)),
    );
    TestValidator.predicate(
      "updated_at is valid ISO datetime",
      !Number.isNaN(Date.parse(retrieved.updated_at)),
    );
    // 7. Validate soft delete timestamp (optional field)
    if (retrieved.deleted_at !== undefined && retrieved.deleted_at !== null) {
      TestValidator.predicate(
        "deleted_at is valid ISO datetime",
        !Number.isNaN(Date.parse(retrieved.deleted_at)),
      );
    }
  });
}
