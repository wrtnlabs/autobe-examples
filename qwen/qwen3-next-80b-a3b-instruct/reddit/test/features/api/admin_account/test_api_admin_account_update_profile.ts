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
export async function test_api_admin_account_update_profile(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create a new connection for admin registration
  const adminConnection: api.IConnection = { host: connection.host };
  // Step 2: Register a new admin account using authorize_admin_join utility
  const adminJoinData: ICommunityPlatformAdmin.IJoin = {
    email: typia.random<string & tags.Format<"email">>(),
    href: "https://example.com/join",
    referrer: "https://example.com",
    ip: null,
  } satisfies ICommunityPlatformAdmin.IJoin;
  const adminAuthorized: ICommunityPlatformAdmin.IAuthorized =
    await authorize_admin_join(adminConnection, { body: adminJoinData });
  // Step 3: Extract admin ID from JWT token (assume payload contains "id" claim)
  const token: string = adminAuthorized.token.access;
  const parts: string[] = token.split(".");
  if (parts.length !== 3) {
    throw new Error("Invalid JWT token format");
  }
  // Decode base64url encoded payload
  const payloadBase64: string = parts[1].replace(/-/g, "+").replace(/_/g, "/");
  const payloadJson: string = atob(payloadBase64);
  const payload: Record<string, any> = JSON.parse(payloadJson);
  const adminId: string = payload.id;
  if (
    !adminId ||
    typeof adminId !== "string" ||
    !adminId.match(/^[0-9a-f-]{36}$/i)
  ) {
    throw new Error("JWT payload does not contain valid admin id");
  }
  // Step 4: Use the same authenticated connection to update the admin profile
  // The connection already has the Authorization header from authorize_admin_join
  // Step 5: Prepare update data with new display_name and email
  const updateData: ICommunityPlatformAdmin.IUpdate = {
    display_name: RandomGenerator.name(),
    email: typia.random<string & tags.Format<"email">>(),
  } satisfies ICommunityPlatformAdmin.IUpdate;
  // Step 6: Call the API to update the admin profile
  const updatedAdmin: ICommunityPlatformAdmin =
    await api.functional.communityPlatform.admin.admins.update(
      adminConnection,
      {
        adminId: adminId,
        body: updateData,
      },
    );
  typia.assert(updatedAdmin);
  // Step 7: Validate that the update succeeded and fields were updated
  TestValidator.equals(
    "display_name was updated",
    updatedAdmin.display_name,
    updateData.display_name,
  );
  TestValidator.equals(
    "email was updated",
    updatedAdmin.email,
    updateData.email,
  );
  // Step 8: Validate that is_active was preserved (not modified)
  TestValidator.equals("is_active preserved", updatedAdmin.is_active, true);
  // Step 9: Validate that sensitive fields are not included in response (ensured by DTO)
  // This is by design - password_hash is not part of ICommunityPlatformAdmin type
}
