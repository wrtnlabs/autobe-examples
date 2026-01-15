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
export async function test_api_inventory_movement_update_type_valid_transition(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Authenticate member using authorization function
  const memberConnection: api.IConnection = { host: connection.host };
  const memberData: ICommunityPlatformMember.IJoin = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  };
  const member: ICommunityPlatformMember.IAuthorized =
    await authorize_member_join(memberConnection, { body: memberData });
  // Step 2: Create (or update) an inventory movement with INBOUND type using the update endpoint
  const movementId = typia.random<string>();
  const initialQuantity = typia.random<
    number & tags.Type<"int32"> & tags.Minimum<1>
  >();
  // First, create the movement by updating it with INBOUND type
  await api.functional.communityPlatform.member.inventory_movements.update(
    memberConnection,
    {
      movementId,
      body: {
        type: "INBOUND", // Specify INBOUND type for initial creation
        quantity: initialQuantity,
      } satisfies ICommunityPlatformInventoryMovements.IUpdate,
    },
  );
  // Step 3: Update movement type from INBOUND to OUTBOUND
  const updateQuantity = typia.random<
    number & tags.Type<"int32"> & tags.Minimum<1>
  >();
  const updatedMovement =
    await api.functional.communityPlatform.member.inventory_movements.update(
      memberConnection,
      {
        movementId,
        body: {
          type: "OUTBOUND", // Update to OUTBOUND type
          quantity: updateQuantity,
        } satisfies ICommunityPlatformInventoryMovements.IUpdate,
      },
    );
  // Step 4: Validate the update was successful
  typia.assert(updatedMovement);
  // Validate that the ratio is a positive number, verifying the system processed the update
  TestValidator.predicate(
    "movement ratio is positive after update",
    updatedMovement.ratio > 0,
  );
}
