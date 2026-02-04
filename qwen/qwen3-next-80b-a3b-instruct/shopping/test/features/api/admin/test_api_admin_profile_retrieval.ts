import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAuthorizationToken";
import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
export async function test_api_admin_profile_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create a new connection and authenticate as admin
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: "https://example.com/join",
      referrer: "https://example.com",
      ip: "192.168.1.1",
    } satisfies IShoppingMallAdmin.IJoin,
  });
  // Step 2: Use the authenticated admin connection to retrieve profile
  const adminProfile: IShoppingMallAdmin =
    await api.functional.shoppingMall.admin.admins.me.at(adminConnection);
  // Step 3: Validate the response structure and types
  typia.assert(adminProfile);
  // Step 4: Verify essential profile fields exist and have correct types
  const validatedProfile = typia.assert<{
    id: string & tags.Format<"uuid">;
    email: string & tags.Format<"email">;
    adminType: "regular" | "super" | null;
  }>(adminProfile);
  typia.assert<string & tags.Format<"uuid">>(validatedProfile.id);
  typia.assert<string & tags.Format<"email">>(validatedProfile.email);
  TestValidator.predicate(
    "adminType is valid",
    validatedProfile.adminType === "regular" ||
      validatedProfile.adminType === "super" ||
      validatedProfile.adminType === null,
  );
  // Step 5: Verify no sensitive fields are present
  TestValidator.predicate("does not contain token", !("token" in adminProfile));
  TestValidator.predicate(
    "has no additional sensitive properties",
    Object.keys(adminProfile).every((key) =>
      ["id", "email", "adminType"].includes(key),
    ),
  );
}