import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
export async function test_api_inventory_movement_deletion_by_admin(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create admin connection and authenticate via join
  const adminConnection: api.IConnection = { host: connection.host };
  const adminEmail = RandomGenerator.alphaNumeric(8) + "@wrtn.io";
  await authorize_admin_join(adminConnection, {
    body: {
      email: adminEmail,
      href: "https://example.com/join",
      referrer: "https://example.com",
      ip: null,
    } satisfies ICommunityPlatformAdmin.IJoin,
  });
  // Step 2: Generate a UUID for the inventory movement to be deleted
  const movementId = typia.random<string & tags.Format<"uuid">>();
  // Step 3: Test successful deletion by admin
  await api.functional.communityPlatform.admin.inventory_movements.erase(
    adminConnection,
    {
      movementId,
    },
  );
  // Step 4: Test unauthorized deletion attempt by unauthenticated user
  const guestConnection: api.IConnection = { host: connection.host };
  await TestValidator.error(
    "unauthenticated user should not be able to delete",
    async () => {
      await api.functional.communityPlatform.admin.inventory_movements.erase(
        guestConnection,
        {
          movementId,
        },
      );
    },
  );
}
