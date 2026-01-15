import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformInventoryAdjustments } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformInventoryAdjustments";
import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
export async function test_api_inventory_adjustment_retrieval_by_admin(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create admin connection and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  const adminCredentials = {
    email: typia.random<string & tags.Format<"email">>(),
    href: "https://example.com/join",
    referrer: "https://example.com",
  } satisfies ICommunityPlatformAdmin.IJoin;
  const admin: ICommunityPlatformAdmin.IAuthorized = await authorize_admin_join(
    adminConnection,
    { body: adminCredentials },
  );
  typia.assert(admin);
  // Step 2: Generate a random UUID for adjustmentId to retrieve
  const adjustmentId = typia.random<string & tags.Format<"uuid">>();
  // Step 3: Retrieve the inventory adjustment
  const retrievedAdjustment =
    await api.functional.communityPlatform.admin.inventory_adjustments.at(
      adminConnection,
      {
        adjustmentId,
      },
    );
  typia.assert(retrievedAdjustment);
  // Step 4: Validate the retrieved adjustment contains all required fields
  // typia.assert already validates all type constraints (UUID format, int32 type)
  // Only validate the reason field is a non-empty string
  TestValidator.predicate(
    "reason is a non-empty string",
    typeof retrievedAdjustment.reason === "string" &&
      retrievedAdjustment.reason.length > 0,
  );
}
