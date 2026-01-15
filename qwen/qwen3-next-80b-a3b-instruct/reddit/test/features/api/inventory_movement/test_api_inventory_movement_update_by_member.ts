import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformInventoryMovements } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformInventoryMovements";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
export async function test_api_inventory_movement_update_by_member(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create a new connection and authenticate member
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies ICommunityPlatformMember.IJoin,
  });
  // Step 2: Generate a valid UUID for the movementId
  const movementId = typia.random<string & tags.Format<"uuid">>();
  // Step 3: Update the inventory movement record with valid values
  const updatedMovement =
    await api.functional.communityPlatform.member.inventory_movements.update(
      memberConnection,
      {
        movementId,
        body: {
          type: "INBOUND",
          quantity: 10,
        } satisfies ICommunityPlatformInventoryMovements.IUpdate,
      },
    );
  typia.assert(updatedMovement);
  // Step 4: Validate the response - ratio must be a positive number
  TestValidator.predicate("ratio is positive", updatedMovement.ratio > 0);
  // Step 5: Test error handling for invalid type
  await TestValidator.error("invalid movement type should fail", async () => {
    await api.functional.communityPlatform.member.inventory_movements.update(
      memberConnection,
      {
        movementId,
        body: {
          type: "INVALID_TYPE" as any, // This should cause type validation error
          quantity: 5,
        } satisfies ICommunityPlatformInventoryMovements.IUpdate,
      },
    );
  });
  // Step 6: Test error handling for negative quantity
  await TestValidator.error("negative quantity should fail", async () => {
    await api.functional.communityPlatform.member.inventory_movements.update(
      memberConnection,
      {
        movementId,
        body: {
          type: "OUTBOUND",
          quantity: -5, // Negative quantity violates min: 0
        } satisfies ICommunityPlatformInventoryMovements.IUpdate,
      },
    );
  });
}
